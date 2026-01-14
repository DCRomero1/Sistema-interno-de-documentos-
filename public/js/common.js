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
window.addEventListener('click', function (event) {
    const dropdown = document.getElementById('userDropdown');
    const userInfo = document.querySelector('.user-info');

    if (dropdown && dropdown.classList.contains('show')) {
        if (userInfo && !userInfo.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    }
});
