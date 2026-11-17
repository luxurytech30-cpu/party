import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { tenantFilter, toObjectId } from '../../lib/tenant.js';
import { requireBusinessPermission } from '../../middleware/businessAccess.js';
import { validateBody } from '../../middleware/validate.js';
import { audit } from '../audit/audit.service.js';
import { getCapabilities } from '../businesses/business.service.js';
import { ALLOWED_FORMATS, businessFolder, cloudinaryConfig, isCloudinaryConfigured, signParams } from './cloudinary.js';
import { Media } from './media.model.js';

const MAX_ITEMS = 60;

const registerSchema = z
  .object({
    publicId: z.string().min(1).max(300),
    url: z.string().url().max(1000),
    width: z.number().int().positive().max(20000).optional(),
    height: z.number().int().positive().max(20000).optional(),
  })
  .strict();

/** Mounted at /businesses/:businessId/media (mergeParams). */
export function mediaRouter() {
  const router = Router({ mergeParams: true });

  router.get('/', requireBusinessPermission('business.read'), async (req, res) => {
    const items = await Media.find(tenantFilter(req.tenant!)).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ items, uploadsEnabled: isCloudinaryConfigured() });
  });

  /** Returns signed params; the browser uploads directly to Cloudinary into the business folder only. */
  router.post('/sign', requireBusinessPermission('media.manage'), async (req, res) => {
    const { effective } = await getCapabilities(req.tenant!);
    if (!effective.includes('portfolio')) throw new AppError(403, 'CAPABILITY_DISABLED', 'Portfolio is not enabled');
    const count = await Media.countDocuments(tenantFilter(req.tenant!));
    if (count >= MAX_ITEMS) throw AppError.conflict(`Portfolio limit (${MAX_ITEMS}) reached`);

    const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
    const params = {
      folder: businessFolder(String(req.tenant!.businessId)),
      timestamp: Math.floor(Date.now() / 1000),
      allowed_formats: ALLOWED_FORMATS,
    };
    res.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      ...params,
      signature: signParams(params, apiSecret),
    });
  });

  /** Register an uploaded asset. Only assets inside this business's folder on our cloud are accepted. */
  router.post('/', requireBusinessPermission('media.manage'), validateBody(registerSchema), async (req, res) => {
    const { cloudName } = cloudinaryConfig();
    const folder = businessFolder(String(req.tenant!.businessId));
    const url = new URL(req.body.url);
    if (
      !req.body.publicId.startsWith(`${folder}/`) ||
      url.protocol !== 'https:' ||
      url.hostname !== 'res.cloudinary.com' ||
      !url.pathname.startsWith(`/${cloudName}/`)
    ) {
      throw AppError.badRequest('Asset does not belong to this business');
    }
    const count = await Media.countDocuments(tenantFilter(req.tenant!));
    if (count >= MAX_ITEMS) throw AppError.conflict(`Portfolio limit (${MAX_ITEMS}) reached`);
    const item = await Media.create({ ...req.body, businessId: req.tenant!.businessId, order: count, uploadedBy: req.auth!.userId });
    res.status(201).json({ item });
  });

  router.delete('/:mediaId', requireBusinessPermission('media.manage'), async (req, res) => {
    const id = toObjectId(req.params.mediaId as string);
    const item = id ? await Media.findOneAndDelete(tenantFilter(req.tenant!, { _id: id })) : null;
    if (!item) throw AppError.notFound('Media not found');
    // Asset deletion on Cloudinary (Admin API) is a follow-up; record is removed from the portfolio.
    await audit({ actorId: req.auth!.userId, businessId: req.tenant!.businessId, action: 'media.delete', targetType: 'Media', targetId: item._id, meta: { publicId: item.publicId } });
    res.status(204).end();
  });

  return router;
}
