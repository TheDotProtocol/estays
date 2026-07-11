import { Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@estays/database';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { param } from '../utils/params';
import { PERMISSIONS } from '@estays/shared';
import { AppError } from '../utils/app-error';
import { auditRepository } from '../repositories/audit.repository';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxSize = (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)) * 1024 * 1024;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('INVALID_FILE', 'Only image files are allowed', 400) as never);
  },
});

export const uploadRouter = Router();

uploadRouter.use(authenticate);

uploadRouter.post(
  '/hotel/:hotelId/images',
  requirePermission(PERMISSIONS.UPLOAD_CREATE),
  upload.array('images', 10),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw AppError.notFound('Hotel');

    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const isOwner = hotel.ownerId === req.user!.sub;
    const isStaff = req.user!.hotelIds?.includes(hotelId);
    if (!isAdmin && !isOwner && !isStaff) throw AppError.forbidden('No access to this hotel');

    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw AppError.badRequest('No files uploaded');

    const isPrimary = req.body.isPrimary === 'true';
    const baseUrl = process.env.API_URL || 'http://localhost:4000';

    const images = await Promise.all(
      files.map(async (file, index) => {
        const url = `${baseUrl}/uploads/${file.filename}`;
        const record = await prisma.fileUpload.create({
          data: {
            uploadedById: req.user!.sub,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            url,
            entityType: 'Hotel',
            entityId: hotelId,
          },
        });

        const hotelImage = await prisma.hotelImage.create({
          data: {
            hotelId,
            url,
            caption: req.body.caption || file.originalname,
            isPrimary: isPrimary && index === 0,
            sortOrder: index,
          },
        });

        return { file: record, hotelImage };
      })
    );

    await auditRepository.log({
      userId: req.user!.sub,
      hotelId,
      action: 'HOTEL_IMAGES_UPLOADED',
      entityType: 'Hotel',
      entityId: hotelId,
      newData: { count: files.length },
    });

    sendCreated(res, { images, message: `${files.length} image(s) uploaded successfully` });
  }
);

uploadRouter.get(
  '/hotel/:hotelId/images',
  async (req: AuthRequest, res: Response) => {
    const images = await prisma.hotelImage.findMany({
      where: { hotelId: param(req.params.hotelId) },
      orderBy: { sortOrder: 'asc' },
    });
    sendSuccess(res, images);
  }
);

uploadRouter.delete(
  '/hotel/:hotelId/images/:imageId',
  requirePermission(PERMISSIONS.UPLOAD_CREATE),
  async (req: AuthRequest, res: Response) => {
    const image = await prisma.hotelImage.findUnique({ where: { id: param(req.params.imageId) } });
    if (!image || image.hotelId !== param(req.params.hotelId)) throw AppError.notFound('Image');

    await prisma.hotelImage.delete({ where: { id: image.id } });
    sendSuccess(res, { deleted: true });
  }
);

const kycUpload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('INVALID_FILE', 'Only PDF or image files allowed for KYC', 400) as never);
  },
});

uploadRouter.post(
  '/partner/kyc',
  kycUpload.array('documents', 5),
  async (req: AuthRequest, res: Response) => {
    const isPartner = req.user!.roles.some((r) => ['PARTNER', 'RECEPTIONIST'].includes(r));
    if (!isPartner) throw AppError.forbidden('Partners only');

    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw AppError.badRequest('No documents uploaded');

    const documentType = (req.body.documentType as string) || 'ID_PROOF';
    const baseUrl = process.env.API_URL || 'http://localhost:4000';
    const userId = req.user!.sub;

    const docs = await Promise.all(
      files.map(async (file) => {
        const url = `${baseUrl}/uploads/${file.filename}`;
        await prisma.fileUpload.create({
          data: {
            uploadedById: userId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            url,
            entityType: 'PartnerKyc',
            entityId: userId,
          },
        });
        return prisma.partnerKycDocument.create({
          data: {
            userId,
            documentType,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            url,
          },
        });
      })
    );

    const docCount = await prisma.partnerKycDocument.count({ where: { userId } });
    if (docCount >= 1) {
      await prisma.user.update({
        where: { id: userId },
        data: { partnerStatus: 'PENDING_APPROVAL' },
      });
    }

    sendCreated(res, { documents: docs, message: `${files.length} KYC document(s) uploaded` });
  }
);

uploadRouter.get('/partner/kyc', async (req: AuthRequest, res: Response) => {
  const docs = await prisma.partnerKycDocument.findMany({
    where: { userId: req.user!.sub },
    orderBy: { uploadedAt: 'desc' },
  });
  sendSuccess(res, docs);
});
