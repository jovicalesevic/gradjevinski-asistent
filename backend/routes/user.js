import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

function sumAdminItems(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, i) => s + (Number(i?.iznos) || 0), 0);
}

function sumMaterials(materials) {
  if (!Array.isArray(materials)) return 0;
  return materials.reduce((s, m) => s + (Number(m?.total) || 0), 0);
}

function recalculateCalculationTotal(calculation) {
  calculation.totalAmount = sumAdminItems(calculation.items) + sumMaterials(calculation.materials);
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/user/calculations/:email - Get saved calculations for a user
router.get('/calculations/:email', async (req, res) => {
  try {
    console.log('Fetching calculations for:', req.params.email);
    const email = decodeURIComponent(req.params.email);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const savedCalculations = Array.isArray(user.savedCalculations) ? user.savedCalculations : [];
    console.log('Sending back calculations:', savedCalculations.length);
    res.json({ savedCalculations });
  } catch (err) {
    console.error('GET CALCULATIONS ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/user/calculations/:email/:calculationId - Delete a saved calculation
router.delete('/calculations/:email/:calculationId', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { calculationId } = req.params;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const calculation = user.savedCalculations.id(calculationId);
    if (!calculation) {
      return res.status(404).json({ error: 'Proračun nije pronađen.' });
    }

    user.savedCalculations.pull(calculationId);
    await user.save();

    res.json({ message: 'Proračun je obrisan.', savedCalculations: user.savedCalculations });
  } catch (err) {
    console.error('DELETE CALCULATION ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/user/calculations/:email/:calculationId/status - Update payment status
router.patch('/calculations/:email/:calculationId/status', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { calculationId } = req.params;
    const { paymentStatus } = req.body;

    if (!paymentStatus || !['U planu', 'Plaćeno'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'paymentStatus must be "U planu" or "Plaćeno"' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const calculation = user.savedCalculations.id(calculationId);
    if (!calculation) {
      return res.status(404).json({ error: 'Proračun nije pronađen.' });
    }

    calculation.paymentStatus = paymentStatus;
    await user.save();

    res.json({ message: 'Status ažuriran.', savedCalculations: user.savedCalculations });
  } catch (err) {
    console.error('PATCH STATUS ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/user/calculations/:email/:calculationId/items/:itemId — ažuriraj administrativnu stavku
router.put('/calculations/:email/:calculationId/items/:itemId', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { calculationId, itemId } = req.params;
    if (!isValidObjectId(calculationId) || !isValidObjectId(itemId)) {
      return res.status(400).json({ error: 'Nevažeći ID.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const calculation = user.savedCalculations.id(calculationId);
    if (!calculation) {
      return res.status(404).json({ error: 'Proračun nije pronađen.' });
    }

    const sub = calculation.items.id(itemId);
    if (!sub) {
      return res.status(404).json({ error: 'Administrativna stavka nije pronađena.' });
    }

    const { vrsta, iznos, category, status } = req.body;
    if (vrsta !== undefined) sub.vrsta = String(vrsta).trim();
    if (iznos !== undefined) sub.iznos = Number(iznos) || 0;
    if (category !== undefined) sub.category = String(category || '').trim();
    if (status !== undefined) {
      sub.status = status === 'Plaćeno' ? 'Plaćeno' : 'U planu';
    }

    recalculateCalculationTotal(calculation);
    await user.save();

    res.json({
      message: 'Administrativna stavka je ažurirana.',
      savedCalculations: user.savedCalculations,
    });
  } catch (err) {
    console.error('PUT ADMIN ITEM ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/user/calculations/:email/:calculationId/items/:itemId — obriši administrativnu stavku
router.delete('/calculations/:email/:calculationId/items/:itemId', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { calculationId, itemId } = req.params;
    if (!isValidObjectId(calculationId) || !isValidObjectId(itemId)) {
      return res.status(400).json({ error: 'Nevažeći ID.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const calculation = user.savedCalculations.id(calculationId);
    if (!calculation) {
      return res.status(404).json({ error: 'Proračun nije pronađen.' });
    }

    const sub = calculation.items.id(itemId);
    if (!sub) {
      return res.status(404).json({ error: 'Administrativna stavka nije pronađena.' });
    }

    sub.deleteOne();
    recalculateCalculationTotal(calculation);
    await user.save();

    res.json({
      message: 'Administrativna stavka je obrisana.',
      savedCalculations: user.savedCalculations,
    });
  } catch (err) {
    console.error('DELETE ADMIN ITEM ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/user/calculations/:email/:calculationId/materials/:materialId — ažuriraj stavku materijala
router.put('/calculations/:email/:calculationId/materials/:materialId', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { calculationId, materialId } = req.params;
    if (!isValidObjectId(calculationId) || !isValidObjectId(materialId)) {
      return res.status(400).json({ error: 'Nevažeći ID.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const calculation = user.savedCalculations.id(calculationId);
    if (!calculation) {
      return res.status(404).json({ error: 'Proračun nije pronađen.' });
    }

    const sub = calculation.materials.id(materialId);
    if (!sub) {
      return res.status(404).json({ error: 'Materijal nije pronađen.' });
    }

    const { name, unit, quantity, unitPrice, total, category, status } = req.body;
    if (name !== undefined) sub.name = String(name).trim();
    if (unit !== undefined) sub.unit = String(unit || '').trim();
    if (quantity !== undefined) sub.quantity = Math.max(0, Number(quantity) || 0);
    if (unitPrice !== undefined) sub.unitPrice = Math.max(0, Number(unitPrice) || 0);
    if (category !== undefined) sub.category = String(category || '').trim() || 'ostalo';
    if (status !== undefined) {
      sub.status = status === 'Plaćeno' ? 'Plaćeno' : 'U planu';
    }

    if (quantity !== undefined || unitPrice !== undefined) {
      const q = sub.quantity;
      const up = sub.unitPrice;
      sub.total = total !== undefined ? Number(total) || 0 : q * up;
    } else if (total !== undefined) {
      sub.total = Number(total) || 0;
    }

    recalculateCalculationTotal(calculation);
    await user.save();

    res.json({
      message: 'Materijal je ažuriran.',
      savedCalculations: user.savedCalculations,
    });
  } catch (err) {
    console.error('PUT MATERIAL ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/user/calculations/:email/:calculationId/materials/:materialId — obriši stavku materijala
router.delete('/calculations/:email/:calculationId/materials/:materialId', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { calculationId, materialId } = req.params;
    if (!isValidObjectId(calculationId) || !isValidObjectId(materialId)) {
      return res.status(400).json({ error: 'Nevažeći ID.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const calculation = user.savedCalculations.id(calculationId);
    if (!calculation) {
      return res.status(404).json({ error: 'Proračun nije pronađen.' });
    }

    const sub = calculation.materials.id(materialId);
    if (!sub) {
      return res.status(404).json({ error: 'Materijal nije pronađen.' });
    }

    sub.deleteOne();
    recalculateCalculationTotal(calculation);
    await user.save();

    res.json({
      message: 'Materijal je obrisan.',
      savedCalculations: user.savedCalculations,
    });
  } catch (err) {
    console.error('DELETE MATERIAL ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/user/save-calculation - Add a calculation to the user's savedCalculations
router.post('/save-calculation', async (req, res) => {
  try {
    const { userId, email, title, items, location, materials } = req.body;

    if (!title || String(title).trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email });
    } else {
      return res.status(400).json({ error: 'userId or email is required' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const rawItems = Array.isArray(items) ? items : [];
    const normalizedItems = rawItems
      .filter((item) => item && String(item.vrsta ?? item.name ?? '').trim())
      .map((item) => ({
        vrsta: String(item.vrsta ?? item.name ?? '').trim(),
        iznos: Number(item.iznos ?? item.amount ?? item.cost ?? 0) || 0,
        category: String(item.category || '').trim(),
        status: item.status === 'Plaćeno' ? 'Plaćeno' : 'U planu',
      }));

    const rawMaterials = Array.isArray(materials) ? materials : [];
    const normalizedMaterials = rawMaterials
      .filter((m) => m && String(m.name || '').trim())
      .map((m) => {
        const quantity = Number(m.quantity) || 0;
        const unitPrice = Number(m.unitPrice) || 0;
        const lineTotal = Number(m.total) || quantity * unitPrice;
        const rawCat = String(m.category || m.categoryId || '').trim();
        const status =
          m.status === 'Plaćeno' || m.status === 'U planu' ? m.status : 'U planu';
        return {
          name: String(m.name).trim(),
          unit: String(m.unit || '').trim(),
          quantity,
          unitPrice,
          total: lineTotal,
          category: rawCat || 'ostalo',
          status,
        };
      });

    const computedTotal = sumAdminItems(normalizedItems) + sumMaterials(normalizedMaterials);

    const newCalculation = {
      title,
      totalAmount: computedTotal,
      items: normalizedItems,
      materials: normalizedMaterials,
      createdAt: new Date(),
      location: location || '',
      paymentStatus: 'U planu',
    };

    user.savedCalculations.push(newCalculation);
    await user.save();

    res.status(201).json({
      message: 'Proračun je sačuvan.',
      user: {
        id: user._id,
        email: user.email,
        savedCalculations: user.savedCalculations,
      },
    });
  } catch (err) {
    console.error('SAVE CALCULATION ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
