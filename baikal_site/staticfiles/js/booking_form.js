// Данные о турах из Django
const toursData = {
    {% for tour in booking_form.fields.tour.queryset %}
    {{ tour.id }}: {
        id: {{ tour.id }},
        title: "{{ tour.title|escapejs }}",
        description: "{{ tour.description|escapejs|truncatechars:200 }}",
        image: "{% if tour.image %}{{ tour.image.url }}{% else %}{% endif %}",
        max_people: {{ tour.max_people }},
        price: {{ tour.price }},
        duration: {{ tour.duration }}
    },
    {% endfor %}
};

// Функция для отображения стикера (toast-уведомления)
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '✓';
    if (type === 'error') icon = '✗';
    if (type === 'info') icon = 'ℹ';
    if (type === 'warning') icon = '⚠';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
        <div class="progress-bar"></div>
    `;
    
    container.appendChild(toast);
    
    const progressBar = toast.querySelector('.progress-bar');
    progressBar.style.animation = `progress ${duration/1000}s linear forwards`;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, duration);
}

// Проверяем, есть ли сообщение об успешном бронировании в URL
function checkForSuccessMessage() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
        showToast('Бронирование успешно оформлено! Спасибо за выбор нашего тура!', 'success', 5000);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

// Функция открытия модального окна
function openModal(modal) {
    modal.style.display = 'block';
}

// Функция закрытия модального окна
function closeModal(modal) {
    modal.style.display = 'none';
}

// Функция показа информации о туре
function showTourInfo() {
    const selectedTourId = parseInt(tourSelect.value);
    const tour = toursData[selectedTourId];
    
    if (tour && tour.id) {
        const modalBody = document.getElementById('modalBody');
        const modalTitle = document.getElementById('modalTitle');
        
        modalTitle.textContent = tour.title;
        
        let imageHtml = '';
        if (tour.image && tour.image !== '') {
            imageHtml = `<img src="${tour.image}" alt="${tour.title}" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px;">`;
        } else {
            imageHtml = `<div style="background: #e0e0e0; padding: 40px; text-align: center; border-radius: 8px; margin-bottom: 15px;">Нет изображения</div>`;
        }
        
        modalBody.innerHTML = imageHtml + `
            <p><strong>Описание:</strong> ${tour.description}</p>
            <p><strong>Длительность:</strong> ${tour.duration} дней</p>
            <p><strong>Цена:</strong> ${tour.price} руб.</p>
            <p><strong>Максимум участников:</strong> ${tour.max_people} чел.</p>
        `;
        
        openModal(tourModal);
    } else {
        showErrorModal('Пожалуйста, выберите тур из списка');
    }
}

// Функция показа модального окна с ошибкой
function showErrorModal(message) {
    const errorModalBody = document.getElementById('errorModalBody');
    errorModalBody.innerHTML = `<p>${message}</p>`;
    openModal(errorModal);
}

// Функция проверки количества человек
function validatePeopleCount() {
    const peopleValue = parseInt(peopleInput.value);
    const selectedTourId = parseInt(tourSelect.value);
    const tour = toursData[selectedTourId];
    const peopleErrorDiv = document.getElementById('peopleError');
    
    peopleErrorDiv.textContent = '';
    peopleInput.style.borderColor = '#ddd';
    peopleInput.style.borderWidth = '1px';
    peopleInput.style.borderStyle = 'solid';
    
    if (isNaN(peopleValue) || peopleInput.value === '') {
        peopleErrorDiv.textContent = 'Пожалуйста, укажите количество человек';
        peopleInput.style.borderColor = 'red';
        return false;
    }
    
    if (peopleValue <= 0) {
        const errorMsg = 'Количество человек должно быть больше нуля';
        peopleErrorDiv.textContent = errorMsg;
        peopleInput.style.borderColor = 'red';
        showErrorModal(errorMsg);
        return false;
    }
    
    if (tour && peopleValue > tour.max_people) {
        const errorMsg = `Количество человек не может превышать ${tour.max_people} для этого тура`;
        peopleErrorDiv.textContent = errorMsg;
        peopleInput.style.borderColor = 'red';
        showErrorModal(errorMsg);
        return false;
    }
    
    return true;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.tourModal = document.getElementById('tourModal');
    window.errorModal = document.getElementById('errorModal');
    window.tourSelect = document.getElementById('id_tour');
    window.peopleInput = document.getElementById('id_people');
    const bookingForm = document.getElementById('bookingForm');
    const showTourInfoBtn = document.getElementById('showTourInfoBtn');
    
    if (showTourInfoBtn) {
        showTourInfoBtn.addEventListener('click', showTourInfo);
    }
    
    if (peopleInput) {
        peopleInput.addEventListener('input', function() {
            const peopleValue = parseInt(this.value);
            const selectedTourId = parseInt(tourSelect.value);
            const tour = toursData[selectedTourId];
            const peopleErrorDiv = document.getElementById('peopleError');
            
            peopleErrorDiv.textContent = '';
            this.style.borderColor = '#ddd';
            
            if (!isNaN(peopleValue) && this.value !== '') {
                if (peopleValue <= 0) {
                    peopleErrorDiv.textContent = 'Количество человек должно быть больше нуля';
                    this.style.borderColor = 'red';
                } else if (tour && peopleValue > tour.max_people) {
                    peopleErrorDiv.textContent = `Максимум для этого тура: ${tour.max_people} человек`;
                    this.style.borderColor = 'red';
                }
            }
        });
    }
    
    if (tourSelect) {
        tourSelect.addEventListener('change', function() {
            const peopleErrorDiv = document.getElementById('peopleError');
            peopleErrorDiv.textContent = '';
            peopleInput.style.borderColor = '#ddd';
            
            if (peopleInput.value !== '') {
                validatePeopleCount();
            }
        });
    }
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(event) {
            if (!validatePeopleCount()) {
                event.preventDefault();
            } else {
                showToast('Отправка данных...', 'info', 2000);
            }
        });
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.close, .close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(tourModal);
            closeModal(errorModal);
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === tourModal) closeModal(tourModal);
        if (event.target === errorModal) closeModal(errorModal);
    });
    
    checkForSuccessMessage();
    
    // Если есть сообщения от Django, показываем их как стикеры
    const djangoMessages = document.querySelectorAll('.django-message');
    djangoMessages.forEach(msg => {
        const tags = msg.getAttribute('data-tags');
        let type = 'success';
        if (tags === 'error') type = 'error';
        if (tags === 'warning') type = 'warning';
        if (tags === 'info') type = 'info';
        showToast(msg.textContent, type, 4000);
    });
});
