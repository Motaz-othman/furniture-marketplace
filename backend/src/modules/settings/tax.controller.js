import multer from 'multer';
import { parse } from 'csv-parse/sync';
import prisma from '../../shared/config/db.js';
import zipcodes from 'zipcodes';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.(csv)$/i)) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
});

export const uploadTaxRates = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const records = parse(req.file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const rows = records
        .filter(r => r.ZipCode && r.EstimatedCombinedRate !== undefined && r.EstimatedCombinedRate !== '')
        .map(r => ({
          zipCode: String(r.ZipCode).padStart(5, '0'),
          regionName: r.TaxRegionName || null,
          rate: parseFloat(r.EstimatedCombinedRate) || 0,
        }));

      if (rows.length === 0) {
        return res.status(400).json({ error: 'No valid rows found. Check that the CSV has ZipCode and EstimatedCombinedRate columns.' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.taxRate.deleteMany();
        await tx.taxRate.createMany({ data: rows });
      });

      res.json({ message: `${rows.length} tax rates loaded successfully`, count: rows.length });
    } catch (error) {
      console.error('Tax rate upload error:', error);
      res.status(500).json({ error: 'Failed to process CSV file. Make sure it is a valid CSV.' });
    }
  },
];

export const getTaxRateSummary = async (req, res) => {
  try {
    const [count, latest] = await Promise.all([
      prisma.taxRate.count(),
      prisma.taxRate.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ]);
    res.json({ count, lastUpdated: latest?.updatedAt || null });
  } catch (error) {
    console.error('Tax rate summary error:', error);
    res.status(500).json({ error: 'Failed to get tax rate summary' });
  }
};

export const getTaxRateByZip = async (zipCode) => {
  if (!zipCode) return 0;
  const record = await prisma.taxRate.findUnique({
    where: { zipCode: String(zipCode).padStart(5, '0') },
    select: { rate: true },
  });
  return record?.rate ?? 0;
};

// GET /settings/tax-rates/lookup/:zipCode  — public, used by storefront checkout
export const lookupTaxRate = async (req, res) => {
  try {
    const { zipCode } = req.params;
    const rate = await getTaxRateByZip(zipCode);
    res.json({ zipCode: String(zipCode).padStart(5, '0'), rate });
  } catch (error) {
    console.error('Tax rate lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup tax rate' });
  }
};

// GET /settings/zip-lookup/:zipCode  — public, offline zip→city/state lookup
export const lookupZipCode = (req, res) => {
  const { zipCode } = req.params;
  const result = zipcodes.lookup(String(zipCode).padStart(5, '0'));
  if (!result) return res.status(404).json({ error: 'ZIP code not found' });
  res.json({ city: result.city, state: result.state });
};
