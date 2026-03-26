import express from 'express';
import User from '../models/User.js';

const router = express.Router();

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

// POST /api/user/save-calculation - Add a calculation to the user's savedCalculations
router.post('/save-calculation', async (req, res) => {
  try {
    const { userId, email, title, totalAmount, items, location, materials } = req.body;

    if (!title || totalAmount == null) {
      return res.status(400).json({ error: 'title and totalAmount are required' });
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

    const newCalculation = {
      title,
      totalAmount: Number(totalAmount),
      items: items || [],
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
