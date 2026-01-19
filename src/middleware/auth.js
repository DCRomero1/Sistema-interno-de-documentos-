// Verificar si el usuario está autenticado
exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
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
