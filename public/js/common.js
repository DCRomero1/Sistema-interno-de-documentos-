// Auth Check on Load
document.addEventListener('DOMContentLoaded', () => {
    checkUserRole();
});

async function checkUserRole() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) return; // Silent fail
        const data = await response.json();

        if (data.authenticated) {
            // Update User Name in Header
            const userDisplay = document.querySelector('.user-info span');
            if (userDisplay && data.user.name) {
                // XSS Protection Helper
                const escapeHtml = (str) => {
                    return String(str)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                };

                userDisplay.innerHTML = `<i class="fa-solid fa-user-circle"></i> ${escapeHtml(data.user.name)} <i class="fa-solid fa-caret-down"></i>`;
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

// Run check
checkBirthdays();
