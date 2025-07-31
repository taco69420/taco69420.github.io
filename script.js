/*
 * Smooth scrolling for navigation links.
 * When the user clicks a navigation link, the page will smoothly scroll
 * to the corresponding section. This small enhancement improves the
 * overall user experience without relying on external libraries.
 */

document.addEventListener('DOMContentLoaded', function () {
  // Select all anchor tags within the nav
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function (event) {
      // Prevent default behaviour so the page doesn't jump instantly
      event.preventDefault();
      // Extract the target section ID by removing the leading '#'
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        // Smoothly scroll to the chosen section
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});