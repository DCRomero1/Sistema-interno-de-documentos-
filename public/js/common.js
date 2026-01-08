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
// 

