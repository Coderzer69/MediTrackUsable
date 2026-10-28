"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const patientRoutes_1 = __importDefault(require("./routes/patientRoutes"));
const doctorRoutes_1 = __importDefault(require("./routes/doctorRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Ensure uploads folder exists
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false, // Allows cross-origin loading of uploaded documents/images
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Static files with fallback for verification documents
app.use('/uploads', (req, res, next) => {
    const filename = path_1.default.basename(req.path);
    const targetPath = path_1.default.join(uploadsDir, filename);
    if (fs_1.default.existsSync(targetPath)) {
        return res.sendFile(targetPath);
    }
    // Fallback for license / qualification documents if exact file is missing
    if (filename.toLowerCase().includes('license')) {
        const licenses = fs_1.default.readdirSync(uploadsDir).filter(f => f.toLowerCase().includes('license'));
        if (licenses.length > 0) {
            return res.sendFile(path_1.default.join(uploadsDir, licenses[0]));
        }
    }
    if (filename.toLowerCase().includes('qualification')) {
        const quals = fs_1.default.readdirSync(uploadsDir).filter(f => f.toLowerCase().includes('qualification'));
        if (quals.length > 0) {
            return res.sendFile(path_1.default.join(uploadsDir, quals[0]));
        }
    }
    next();
});
app.use('/uploads', express_1.default.static(uploadsDir));
// Root and Health Endpoints
app.get('/', (req, res) => {
    res.status(200).json({
        name: 'MediTrack Backend API',
        status: 'online',
        port: Number(port),
        message: 'Backend is working finely on localhost:' + port,
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            admin: '/api/admin',
            patient: '/api/patient',
            doctor: '/api/doctor',
            uploads: '/uploads',
        },
    });
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/patient', patientRoutes_1.default);
app.use('/api/doctor', doctorRoutes_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port} (http://localhost:${port})`);
});
exports.default = app;
