// Auth Check, Sidebar & Theme Init on Load
document.addEventListener('DOMContentLoaded', () => {
    checkUserRole();
    initSidebarToggle();
    initDarkMode();
});

function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const brandIcon = document.querySelector('.brand-icon-container'); // Select the shield
    const sidebar = document.querySelector('.sidebar');

    // Restore state immediately to avoid flicker (if possible, though this runs on DOMReady)
    if (sidebar && localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    // Toggle function
    const toggleSidebar = () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    };

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }

    if (brandIcon && sidebar) {
        brandIcon.addEventListener('click', toggleSidebar);
    }
}

function initDarkMode() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const icon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
    const body = document.body;

    // 1. Check LocalStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }

    // 2. Toggle Event
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');

            localStorage.setItem('theme', isDark ? 'dark' : 'light');

            if (icon) {
                if (isDark) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        });
    }
}

async function checkUserRole() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) return; // Silent fail
        const data = await response.json();

        if (data.authenticated) {
            // Guardar usuario actual globalmente para uso en otras páginas
            window.__currentUser = data.user;
            // --- Update Sidebar User Info (New Design) ---
            const headerName = document.getElementById('sidebar-username');
            const headerRole = document.getElementById('sidebar-role');

            if (headerName && data.user.name) {
                // Shorten name to first 2 words if too long
                const shortName = data.user.name.split(' ').slice(0, 2).join(' ');
                headerName.textContent = shortName;
            }

            if (headerRole && data.user.role) {
                // Formatting role: admin -> Administrador
                const roleMap = {
                    'admin': 'Administrador',
                    'user': 'Usuario',
                    'editor': 'Editor'
                };
                headerRole.textContent = roleMap[data.user.role] || data.user.role;
            }

            // Update Avatar if available (future proofing)
            // const userAvatar = document.querySelector('.u-avatar');
            // if(userAvatar && data.user.avatar) userAvatar.src = data.user.avatar;

            // --- Keep Legacy/Editor Update just in case (optional) ---
            const editorName = document.getElementById('editorUserName');
            const editorEmail = document.getElementById('editorUserEmail');
            if (editorName && data.user.name) {
                editorName.textContent = data.user.name;
            }
            if (editorEmail && data.user.username) {
                editorEmail.textContent = `${data.user.username}@vigil.edu.pe`;
            }

            if (data.user.role === 'admin') {
                const adminLinks = document.querySelectorAll('#nav-admin-users');
                adminLinks.forEach(el => el.style.display = 'block');
            }
        }
    } catch (err) {
        console.error('Error checking role:', err);
    }
}

// Toggle User Dropdown
function toggleUserDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
window.addEventListener('click', function (event) {
    const dropdown = document.getElementById('userDropdown');
    const userInfo = document.querySelector('.user-info');

    if (dropdown && dropdown.classList.contains('show')) {
        if (userInfo && !userInfo.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    }
});

// Clear session storage on logout
document.addEventListener('DOMContentLoaded', () => {
    // Escuchar clicks en cualquier botón de logout con la clase correcta
    document.addEventListener('click', (e) => {
        if (e.target.closest('.u-logout-card-btn')) {
            sessionStorage.removeItem('birthdayShown');
        }
    });

    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', () => {
            sessionStorage.removeItem('birthdayShown');
        });
    }
});

// Birthday Notification Logic
async function checkBirthdays() {
    // Only run if SweetAlert is loaded
    if (typeof Swal === 'undefined') return;

    // Check if we already showed it this session to avoid annoyance
    if (sessionStorage.getItem('birthdayShown')) return;

    try {
        const response = await fetch('/api/workers/birthdays');
        if (!response.ok) return;

        const birthdays = await response.json();
        if (birthdays.length === 0) return;

        // Filter for very close birthdays (e.g., next 7 days)
        const nearby = birthdays.filter(b => b.daysUntil <= 7);

        if (nearby.length > 0) {
            // Construct message
            const names = nearby.map(b => {
                const time = b.daysUntil === 0 ? '¡Hoy!' : (b.daysUntil === 1 ? 'Mañana' : `en ${b.daysUntil} días`);
                return `<b>${b.fullName.split(' ')[0]}</b> (${time})`;
            }).join('<br>');

            // Show Toast
            Swal.fire({
                title: '🎂 ¡Cumpleaños Cercanos!',
                html: names,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 8000,
                timerProgressBar: true,
                background: '#fff',
                color: '#333',
                iconColor: '#e67e22',
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });

            // Mark as shown
            sessionStorage.setItem('birthdayShown', 'true');
        }

    } catch (e) {
        console.error('Error checking birthdays', e);
    }
}

// Run check Correr.
checkBirthdays();
