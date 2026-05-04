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

// Функция для плавного показа/скрытия блока
function toggleInfoBlock(show, hasContent) {
    const infoBlock = document.getElementById('tourInfoBlock');
    if (!infoBlock) return;
    
    if (show && hasContent) {
        infoBlock.style.maxHeight = '500px';
        infoBlock.style.padding = '15px';
        infoBlock.style.marginTop = '15px';
    } else {
        infoBlock.style.maxHeight = '0';
        infoBlock.style.padding = '0';
        infoBlock.style.marginTop = '0';
    }
}

// Функция для отображения стикера
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
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
    if (progressBar) {
        progressBar.style.animation = `progress ${duration/1000}s linear forwards`;
    }
    
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
    }
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, duration);
}

// Функция обновления кнопки
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

// AJAX с Deferred-объектами

// Прелоадер
function showPreloader() {
    removePreloader();
    
    const preloader = document.createElement('div');
    preloader.id = 'customPreloader';
    preloader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(3px);
    `;
    
    preloader.innerHTML = `
        <div style="
            background: white;
            padding: 30px 40px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 0 30px rgba(0,0,0,0.3);
        ">
            <div style="
                width: 50px;
                height: 50px;
                border: 4px solid #f0f9f0;
                border-top: 4px solid #71b378;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            "></div>
            <div style="font-size: 16px; color: #2d5a2e; font-weight: bold;">🔍 Загрузка информации...</div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(preloader);
}

function hidePreloader() {
    const preloader = document.getElementById('customPreloader');
    if (preloader) {
        preloader.remove();
    }
}

function removePreloader() {
    const preloader = document.getElementById('customPreloader');
    if (preloader) preloader.remove();
}

// AJAX запрос с Deferred
function getTourDetailsDeferred(tourId) {
    const deferred = $.Deferred();
    
    $.ajax({
        url: `/ajax/tour-details/?tour_id=${tourId}`,
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
        success: function(data) {
            deferred.resolve(data);
        },
        error: function(xhr, status, error) {
            let errorMessage = 'Ошибка загрузки информации';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMessage = xhr.responseJSON.error;
            } else if (status === 'timeout') {
                errorMessage = 'Превышено время ожидания';
            }
            deferred.reject(errorMessage);
        }
    });
    
    return deferred.promise();
}

// Отображение полной информации о туре в блоке (без модального окна)
function displayTourInfo(tour) {
    const infoText = document.getElementById('tourInfoText');
    if (!infoText) return;
    
    const availableSeats = tour.available_seats;
    const seatsStatus = availableSeats > 0 
        ? `<span style="color: #28a745; font-weight: bold;">✅ Свободно мест: ${availableSeats}</span>` 
        : `<span style="color: #dc3545; font-weight: bold;">❌ Нет свободных мест</span>`;
    
    let imageHtml = '';
    if (tour.image_url) {
        imageHtml = `<img src="${tour.image_url}" alt="${tour.title}" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">`;
    }
    
    infoText.innerHTML = `
        ${imageHtml}
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between;">
            <div style="flex: 1;">
                <div style="margin-bottom: 8px;">
                    <strong>📋 ${tour.title}</strong>
                </div>
                <div style="margin-bottom: 8px; font-size: 13px; color: #555;">
                    ${tour.description.substring(0, 150)}${tour.description.length > 150 ? '...' : ''}
                </div>
            </div>
            <div style="min-width: 180px;">
                <div style="margin-bottom: 5px;">⏱ Длительность: ${tour.duration} дней</div>
                <div style="margin-bottom: 5px;">💰 Цена: ${tour.price} руб/чел</div>
                <div style="margin-bottom: 5px;">👥 Максимум: ${tour.max_people} чел.</div>
                <div>📊 Забронировано: ${tour.total_booked} чел.</div>
            </div>
        </div>
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #c8e6c9; text-align: center;">
            ${seatsStatus}
        </div>
    `;
    
    updateSubmitButton(availableSeats > 0);
    toggleInfoBlock(true, true);
}

// Основная функция получения информации о туре
function loadTourInfo(tourId) {
    if (!tourId) {
        toggleInfoBlock(false, false);
        return;
    }
    
    const infoText = document.getElementById('tourInfoText');
    if (infoText) {
        infoText.innerHTML = '<div style="text-align: center; padding: 15px;">🔄 Загрузка информации о туре...</div>';
        toggleInfoBlock(true, true);
    }
    
    getTourDetailsDeferred(tourId)
        .done(function(data) {
            if (data.success) {
                displayTourInfo(data.tour);
                // Показываем toast только при ошибках, при успехе - без уведомления
            } else {
                const infoText = document.getElementById('tourInfoText');
                if (infoText) {
                    infoText.innerHTML = `<span style="color: #dc3545;">❌ ${data.error || 'Ошибка загрузки'}</span>`;
                }
            }
        })
        .fail(function(errorMessage) {
            const infoText = document.getElementById('tourInfoText');
            if (infoText) {
                infoText.innerHTML = `<span style="color: #dc3545;">❌ ${errorMessage}</span>`;
            }
            showToast(errorMessage, 'error', 3000);
        });
}

// ============= Расчет стоимости =============
async function calculatePrice(tourId, peopleCount) {
    if (!tourId || !peopleCount || peopleCount <= 0) return;
    
    const priceBlock = document.getElementById('priceCalculation');
    if (!priceBlock) return;
    
    const tour = window.toursData[tourId];
    if (!tour) return;
    
    if (peopleCount > tour.max_people) {
        priceBlock.style.display = 'block';
        priceBlock.innerHTML = `
            <div style="background: #fee; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #dc3545;">
                <div style="color: #dc3545;">⚠️ Максимум для этого тура: ${tour.max_people} человек</div>
            </div>
        `;
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
                    <strong style="color: #2d5a2e;">💰 Итоговая стоимость:</strong>
                    <div style="font-size: 22px; font-weight: bold; margin-top: 8px; color: #71b378;">
                        ${totalPrice} ${calc.currency}
                    </div>
                    <small style="color: #666;">${calc.price_per_person} руб. × ${calc.people_count} чел.</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        priceBlock.innerHTML = `
            <div style="background: #fee; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #dc3545;">
                <div style="color: #dc3545;">❌ Ошибка расчета стоимости</div>
            </div>
        `;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    const toursData = window.toursData || {};
    
    const tourModal = document.getElementById('tourModal');
    const errorModal = document.getElementById('errorModal');
    const tourSelect = document.getElementById('id_tour');
    const peopleInput = document.getElementById('id_people');
    const bookingForm = document.getElementById('bookingForm');
    
    // При выборе тура - автоматически загружаем информацию
    if (tourSelect) {
        // Загружаем информацию для первого выбранного тура
        if (tourSelect.value) {
            loadTourInfo(tourSelect.value);
        }
        
        // Обработчик изменения выбора
        tourSelect.addEventListener('change', function() {
            loadTourInfo(this.value);
        });
    }
    
    // Расчет стоимости при изменении количества человек
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
                    peopleErrorDiv.textContent = 'Количество человек должно быть больше нуля';
                    this.style.borderColor = 'red';
                    updateSubmitButton(false);
                } else if (tour && peopleValue > tour.max_people) {
                    peopleErrorDiv.textContent = `Максимум для этого тура: ${tour.max_people} человек`;
                    this.style.borderColor = 'red';
                    updateSubmitButton(false);
                } else {
                    updateSubmitButton(true);
                }
            }
        });
    }
    
    // Отправка формы
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(event) {
            const peopleValue = parseInt(peopleInput.value);
            const selectedTourId = parseInt(tourSelect.value);
            const tour = toursData[selectedTourId];
            
            if (isNaN(peopleValue) || peopleValue <= 0) {
                event.preventDefault();
                showToast('Пожалуйста, укажите корректное количество человек', 'error', 3000);
            } else if (tour && peopleValue > tour.max_people) {
                event.preventDefault();
                showToast(`Количество человек не может превышать ${tour.max_people}`, 'error', 3000);
            }
        });
    }
    
    // Закрытие модальных окон (если они еще нужны для ошибок)
    document.querySelectorAll('.close, .close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (tourModal) tourModal.style.display = 'none';
            if (errorModal) errorModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === tourModal) tourModal.style.display = 'none';
        if (event.target === errorModal) errorModal.style.display = 'none';
    });
    
    // Проверка успешного бронирования
    if (window.location.search.includes('success=1')) {
        showToast('Бронирование успешно оформлено! Спасибо за выбор нашего тура!', 'success', 5000);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Сообщения от Django
    document.querySelectorAll('.django-message').forEach(msg => {
        const tags = msg.getAttribute('data-tags');
        let type = 'success';
        if (tags === 'error') type = 'error';
        if (tags === 'warning') type = 'warning';
        if (tags === 'info') type = 'info';
        showToast(msg.textContent, type, 4000);
    });
});
