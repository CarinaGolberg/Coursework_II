// luxury.js - Анимации и эффекты

document.addEventListener('DOMContentLoaded', function() {

    /* =========================================
       NAVIGATION + SCROLL TOP BUTTON
    ========================================= */

    const nav = document.getElementById('mainNav');
    const hero = document.getElementById('hero');

    // Создаем кнопку "Наверх"
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.id = 'scrollTopBtn';
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.innerHTML = '↑';

    document.body.appendChild(scrollTopBtn);

    // Поведение при скролле
    window.addEventListener('scroll', function() {

        // Скрываем navbar после hero
        if (nav && hero) {

            if (window.scrollY > hero.offsetHeight - 120) {
                nav.classList.add('hidden-nav');
            } else {
                nav.classList.remove('hidden-nav');
            }

        }

        // Показываем кнопку "Наверх"
        if (window.scrollY > 500) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }

    });

    // Плавный скролл наверх
    scrollTopBtn.addEventListener('click', () => {

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

    });

    /* =========================================
       ПЛАВНЫЙ СКРОЛЛ ДЛЯ ЯКОРЕЙ
    ========================================= */

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {

        anchor.addEventListener('click', function(e) {

            const target = document.querySelector(
                this.getAttribute('href')
            );

            if (target) {

                e.preventDefault();

                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

            }

        });

    });

    /* =========================================
       ANIMATION ON SCROLL
    ========================================= */

    const fadeElements = document.querySelectorAll('.fade-up');

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add('visible');

                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    fadeElements.forEach(el => observer.observe(el));

    /* =========================================
       TOAST NOTIFICATIONS
    ========================================= */

    window.showToast = function(
        message,
        type = 'success',
        duration = 3000
    ) {

        let container =
            document.getElementById('toastContainer');

        if (!container) {

            container = document.createElement('div');

            container.id = 'toastContainer';

            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;

            document.body.appendChild(container);

        }

        const toast = document.createElement('div');

        toast.className = `toast toast-${type}`;

        toast.style.cssText = `
            min-width: 280px;
            background: var(--graphite, #1E2022);
            border-left: 3px solid ${
                type === 'success'
                ? '#00E5FF'
                : '#dc3545'
            };
            border-radius: 12px;
            padding: 14px 20px;
            color: white;
            font-size: 14px;
            box-shadow:
                0 10px 25px -5px rgba(0,0,0,0.2);
            animation:
                slideInRight 0.3s ease;
            backdrop-filter: blur(10px);
        `;

        toast.innerHTML = message;

        container.appendChild(toast);

        setTimeout(() => {

            toast.style.animation =
                'slideOutRight 0.3s ease';

            setTimeout(() => toast.remove(), 300);

        }, duration);

    };

});

/* =========================================
   TOAST ANIMATIONS
========================================= */

const style = document.createElement('style');

style.textContent = `

    @keyframes slideInRight {

        from {
            transform: translateX(100%);
            opacity: 0;
        }

        to {
            transform: translateX(0);
            opacity: 1;
        }

    }

    @keyframes slideOutRight {

        from {
            transform: translateX(0);
            opacity: 1;
        }

        to {
            transform: translateX(100%);
            opacity: 0;
        }

    }

`;

document.head.appendChild(style);
