// booking_form.js - Исправленная версия с блокировкой кнопки

// Функция для получения CSRF токена из куки
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Функция для обновления состояния кнопки
function updateSubmitButton(isAvailable) {
    const submitButton = document.querySelector('#bookingForm button[type="submit"]');
    if (!submitButton) return;
    
    if (isAvailable) {
        submitButton.disabled = false;
        submitButton.style.background = '#71b378';
        submitButton.style.cursor = 'pointer';
        submitButton.title = '';
    } else {
        submitButton.disabled = true;
        submitButton.style.background = '#cccccc';
        submitButton.style.cursor = 'not-allowed';
        submitButton.title = 'Нет свободных мест для бронирования';
    }
}

// AJAX запрос 1: Получение детальной информации о туре
async function getTourDetails(tourId) {
    if (!tourId) return;
    
    const infoBlock = document.getElementById('tourInfoBlock');
    const infoText = document.getElementById('tourInfoText');
    
    if (infoBlock) {
        infoBlock.style.display = 'block';
        infoText.innerHTML = '🔄 Загрузка информации о туре...';
    }
    
    try {
        const response = await fetch(`/ajax/tour-details/?tour_id=${tourId}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            const tour = data.tour;
            const availableSeats = tour.available_seats;
            const seatsStatus = availableSeats > 0 
                ? `<span style="color: #28a745;">✅ Свободно мест: ${availableSeats}</span>` 
                : `<span style="color: #dc3545;">❌ Нет свободных мест</span>`;
            
            // Блокируем или разблокируем кнопку в зависимости от наличия мест
            updateSubmitButton(availableSeats > 0);
            
            let imageHtml = '';
            if (tour.image_url) {
                imageHtml = `<img src="${tour.image_url}" alt="${tour.title}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">`;
            } else {
                imageHtml = `<div style="background: #e0e0e0; padding: 40px; text-align: center; border-radius: 8px; margin-bottom: 10px;">🖼️ Нет изображения</div>`;
            }
            
            if (infoText) {
                infoText.innerHTML = `
                    ${imageHtml}
                    <div style="font-size: 14px;">
                        <strong>📋 ${tour.title}</strong><br>
                        📝 ${tour.description}<br><br>
                        ⏱ Длительность: ${tour.duration} дней<br>
                        💰 Цена: ${tour.price} руб/чел<br>
                        👥 Максимум: ${tour.max_people} чел.<br>
                        📊 Уже забронировано: ${tour.total_booked} чел.<br>
                        ${seatsStatus}
                    </div>
                `;
            }
        } else {
            updateSubmitButton(true); // При ошибке не блокируем
            showToast(data.error || 'Ошибка загрузки информации о туре', 'error', 3000);
            if (infoText) {
                infoText.innerHTML = '<span style="color: #dc3545;">❌ Не удалось загрузить информацию</span>';
            }
        }
    } catch (error) {
        console.error('AJAX Error:', error);
        updateSubmitButton(true); // При ошибке не блокируем
        showToast('Ошибка соединения при загрузке информации', 'error', 3000);
        if (infoText) {
            infoText.innerHTML = '<span style="color: #dc3545;">❌ Ошибка соединения</span>';
        }
    }
}

// AJAX запрос 2: Расчет стоимости тура (без скидки)
async function calculatePrice(tourId, peopleCount) {
    if (!tourId || !peopleCount || peopleCount <= 0) return;
    
    const priceBlock = document.getElementById('priceCalculation');
    if (!priceBlock) return;
    
    const tour = window.toursData[tourId];
    if (!tour) return;
    
    // Проверяем, не превышает ли количество человек максимум
    if (peopleCount > tour.max_people) {
        priceBlock.style.display = 'block';
        priceBlock.innerHTML = `
            <div style="background: #fee; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #dc3545;">
                <div style="color: #dc3545;">
                    ⚠️ Количество человек не может превышать ${tour.max_people}
                </div>
            </div>
        `;
        updateSubmitButton(true); // При превышении лимита не блокируем, а показываем ошибку
        return;
    }
    
    priceBlock.style.display = 'block';
    priceBlock.innerHTML = '🔄 Расчет стоимости...';
    
    try {
        const response = await fetch(`/ajax/calculate-price/?tour_id=${tourId}&people_count=${peopleCount}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            const calc = data.calculation;
            const totalPrice = calc.price_per_person * calc.people_count;
            
            priceBlock.innerHTML = `
                <div style="background: #f0f9f0; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #71b378;">
                    <strong style="color: #2d5a2e;">💰 Расчет стоимости:</strong><br>
                    <small>${calc.price_per_person} руб. × ${calc.people_count} чел. = ${totalPrice} руб.</small>
                    <div style="font-size: 20px; font-weight: bold; margin-top: 10px; color: #71b378;">
                        Итого: ${totalPrice} ${calc.currency}
                    </div>
                </div>
            `;
            updateSubmitButton(true); // Кнопка активна, если есть места (проверим при отправке)
        } else {
            priceBlock.innerHTML = `
                <div style="background: #fee; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #dc3545;">
                    <div style="color: #dc3545;">
                        ❌ ${data.error || 'Ошибка расчета стоимости'}
                    </div>
                </div>
            `;
            showToast(data.error || 'Ошибка расчета стоимости', 'error', 3000);
        }
    } catch (error) {
        console.error('AJAX Error:', error);
        priceBlock.innerHTML = `
            <div style="background: #fee; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #dc3545;">
                <div style="color: #dc3545;">
                    ❌ Ошибка соединения при расчете стоимости
                </div>
            </div>
        `;
        showToast('Ошибка соединения при расчете стоимости', 'error', 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const toursData = window.toursData || {};
    
    const tourModal = document.getElementById('tourModal');
    const errorModal = document.getElementById('errorModal');
    const tourSelect = document.getElementById('id_tour');
    const peopleInput = document.getElementById('id_people');
    const bookingForm = document.getElementById('bookingForm');
    const showTourInfoBtn = document.getElementById('showTourInfoBtn');
    
    // При загрузке страницы кнопка активна
    updateSubmitButton(true);
    
    // Обработчик для кнопки информации о туре
    if (showTourInfoBtn && tourSelect) {
        showTourInfoBtn.addEventListener('click', function() {
            const selectedTourId = tourSelect.value;
            if (selectedTourId) {
                getTourDetails(selectedTourId);
            } else {
                showToast('Пожалуйста, выберите тур', 'warning', 2000);
            }
        });
    }
    
    // Обработчик для расчета стоимости
    if (peopleInput && tourSelect) {
        let debounceTimer;
        
        peopleInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const selectedTourId = tourSelect.value;
                const peopleCount = parseInt(this.value);
                
                if (selectedTourId && peopleCount && peopleCount > 0) {
                    calculatePrice(selectedTourId, peopleCount);
                } else if (peopleCount === 0 || isNaN(peopleCount)) {
                    const priceBlock = document.getElementById('priceCalculation');
                    if (priceBlock) priceBlock.style.display = 'none';
                }
            }, 300);
        });
        
        tourSelect.addEventListener('change', function() {
            const peopleCount = peopleInput.value;
            if (this.value && peopleCount && parseInt(peopleCount) > 0) {
                calculatePrice(this.value, parseInt(peopleCount));
            }
        });
    }
    
    // Валидация количества человек
    if (peopleInput && tourSelect) {
        peopleInput.addEventListener('input', function() {
            const peopleValue = parseInt(this.value);
            const selectedTourId = parseInt(tourSelect.value);
            const tour = toursData[selectedTourId];
            const peopleErrorDiv = document.getElementById('peopleError');
            
            if (peopleErrorDiv) peopleErrorDiv.textContent = '';
            this.style.borderColor = '#ddd';
            
            if (!isNaN(peopleValue) && this.value !== '') {
                if (peopleValue <= 0) {
                    if (peopleErrorDiv) peopleErrorDiv.textContent = 'Количество человек должно быть больше нуля';
                    this.style.borderColor = 'red';
                    updateSubmitButton(false);
                } else if (tour && peopleValue > tour.max_people) {
                    if (peopleErrorDiv) peopleErrorDiv.textContent = `Максимум для этого тура: ${tour.max_people} человек`;
                    this.style.borderColor = 'red';
                    updateSubmitButton(false);
                } else {
                    // Если количество корректное, кнопка будет разблокирована, если есть места
                    // Места проверяются в getTourDetails
                }
            }
        });
    }
    
    // Обработка отправки формы - дополнительная проверка перед отправкой
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(event) {
            const peopleValue = parseInt(peopleInput.value);
            const selectedTourId = parseInt(tourSelect.value);
            const tour = toursData[selectedTourId];
            
            // Проверяем, не заблокирована ли кнопка
            const submitButton = document.querySelector('#bookingForm button[type="submit"]');
            if (submitButton && submitButton.disabled) {
                event.preventDefault();
                showToast('Бронирование временно недоступно (нет свободных мест)', 'error', 3000);
                return;
            }
            
            if (isNaN(peopleValue) || peopleValue <= 0) {
                event.preventDefault();
                showToast('Пожалуйста, укажите корректное количество человек', 'error', 3000);
            } else if (tour && peopleValue > tour.max_people) {
                event.preventDefault();
                showToast(`Количество человек не может превышать ${tour.max_people}`, 'error', 3000);
            }
        });
    }
    
    // Закрытие модальных окон
    const closeButtons = document.querySelectorAll('.close, .close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (tourModal) tourModal.style.display = 'none';
            if (errorModal) errorModal.style.display = 'none';
        });
    });
    
    if (tourModal && errorModal) {
        window.addEventListener('click', function(event) {
            if (event.target === tourModal) tourModal.style.display = 'none';
            if (event.target === errorModal) errorModal.style.display = 'none';
        });
    }
    
    // Проверка успешного бронирования
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
        showToast('Бронирование успешно оформлено! Спасибо за выбор нашего тура!', 'success', 5000);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    // Сообщения от Django
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
