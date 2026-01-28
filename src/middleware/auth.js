// Verificar si el usuario está autenticado
exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    // Check if it's an API call
    if (req.path.startsWith('/api') || req.headers.accept?.includes('json')) {
        return res.status(401).json({ error: 'Sesión expirada o no autorizado' });
    }
    res.redirect('/login');
};

// Verificar si el usuario es administrador
exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).send('<h1>403 Forbidden</h1><p>Acceso denegado. Solo administradores.</p><a href="/">Volver</a>');
};
