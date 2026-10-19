import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';
await mongoose.connect(process.env.MONGODB_URI);
const s = app.listen(process.env.PORT || 5000, () => console.log('API prête'));
process.on('SIGTERM', () => s.close(() => mongoose.disconnect()));
