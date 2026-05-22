// booking_form.js - Полная версия с AJAX отправкой

// Глобальные переменные
let currentTourData = null;
let currentScheduleAvailableSeats = 0;
let availabilityCheckInterval = null;
let lastCheckedScheduleId = null;
let isSubmitting = false;

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

// Функция для открытия модального окна
function openModal(modal) {
    if (modal) modal.style.display = 'block';
}

// Функция для закрытия модального окна
function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

// Функция для отображения стикера
function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toastContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
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
        min-width: 250px;
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInRight 0.3s ease;
        position: relative;
        overflow: hidden;
    `;
    
    let icon = '✓';
    let iconColor = '#28a745';
    if (type === 'error') {
        icon = '✗';
        iconColor = '#dc3545';
    }
    if (type === 'info') {
        icon = 'ℹ';
        iconColor = '#17a2b8';
    }
    if (type === 'warning') {
        icon = '⚠';
        iconColor = '#ffc107';
    }
    
    toast.innerHTML = `
        <div style="color: ${iconColor}; font-size: 20px; font-weight: bold;">${icon}</div>
        <div style="flex: 1; font-size: 14px;">${message}</div>
        <button style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999; padding: 0 5px;">&times;</button>
        <div style="position: absolute; bottom: 0; left: 0; height: 3px; background: ${iconColor}; width: 100%; animation: progress ${duration/1000}s linear forwards;"></div>
    `;
    
    container.appendChild(toast);
    
    if (!document.querySelector('#toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(style);
    }
    
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
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

// Функция обновления кнопки отправки
function updateSubmitButton(isAvailable, peopleCount = null) {
    const submitButton = document.querySelector('#bookingForm button[type="submit"]');
    const peopleInput = document.getElementById('id_people');
    
    if (!submitButton) return;
    
    let shouldEnable = isAvailable === true;
    
    const scheduleId = document.getElementById('id_schedule')?.value;
    const currentPeopleCount = peopleCount !== null ? peopleCount : (peopleInput ? parseInt(peopleInput.value) : 0);
    
    if (!scheduleId || !currentPeopleCount || currentPeopleCount <= 0) {
        shouldEnable = false;
    }
    
    if (currentTourData && currentPeopleCount > currentTourData.max_people) {
        shouldEnable = false;
    }
    
    if (isSubmitting) {
        shouldEnable = false;
    }
    
    if (shouldEnable) {
        submitButton.disabled = false;
        submitButton.style.background = '#71b378';
        submitButton.style.cursor = 'pointer';
        submitButton.title = '';
        submitButton.style.opacity = '1';
    } else {
        submitButton.disabled = true;
        submitButton.style.background = '#cccccc';
        submitButton.style.cursor = 'not-allowed';
        submitButton.title = 'Заполните все поля и выберите дату со свободными местами';
        submitButton.style.opacity = '0.6';
    }
}

// Функция для обновления информации о доступности в реальном времени
async function updateAvailabilityInRealTime(scheduleId, peopleCount) {
    if (!scheduleId) return;
    
    try {
        const response = await fetch(`/ajax/schedule-availability/?schedule_id=${scheduleId}&people_count=${peopleCount || 1}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.success && data.schedule) {
            const schedule = data.schedule;
            currentScheduleAvailableSeats = schedule.available_seats;
            
            const scheduleSelect = document.getElementById('id_schedule');
            if (scheduleSelect) {
                const selectedOption = scheduleSelect.querySelector('option:checked');
                if (selectedOption && selectedOption.value == scheduleId) {
                    const seatsText = schedule.available_seats > 0 
                        ? ` ✅ свободно: ${schedule.available_seats} мест`
                        : ` ❌ НЕТ МЕСТ!`;
                    const originalText = selectedOption.textContent.split('✅')[0].split('❌')[0];
                    selectedOption.textContent = `${originalText}${seatsText}`;
                    selectedOption.disabled = !schedule.is_available;
                    if (schedule.available_seats > 0) {
                        selectedOption.dataset.availableSeats = schedule.available_seats;
                    }
                }
            }
            
            const scheduleInfo = document.getElementById('scheduleInfo');
            if (scheduleInfo && scheduleSelect && scheduleSelect.value === scheduleId) {
                if (schedule.is_available) {
                    if (peopleCount && peopleCount > 0) {
                        if (peopleCount <= schedule.available_seats) {
                            scheduleInfo.innerHTML = `
                                <div style="background: #d4edda; padding: 12px; border-radius: 8px; color: #155724; border-left: 4px solid #28a745;">
                                    <strong>✅ Доступно мест:</strong> ${schedule.available_seats} из ${schedule.max_people}<br>
                                    <strong>📊 Уже забронировано:</strong> ${schedule.total_booked}<br>
                                    <span style="color: #28a745;">✓ Можно забронировать ${peopleCount} чел.</span>
                                </div>
                            `;
                            updateSubmitButton(true, peopleCount);
                        } else {
                            scheduleInfo.innerHTML = `
                                <div style="background: #fff3cd; padding: 12px; border-radius: 8px; color: #856404; border-left: 4px solid #ffc107;">
                                    <strong>⚠️ Недостаточно мест!</strong><br>
                                    <strong>Доступно:</strong> ${schedule.available_seats} мест<br>
                                    <strong>Запрошено:</strong> ${peopleCount} мест
                                </div>
                            `;
                            updateSubmitButton(false, peopleCount);
                        }
                    } else {
                        scheduleInfo.innerHTML = `
                            <div style="background: #d4edda; padding: 12px; border-radius: 8px; color: #155724; border-left: 4px solid #28a745;">
                                <strong>✅ Доступно мест:</strong> ${schedule.available_seats} из ${schedule.max_people}<br>
                                <strong>📊 Уже забронировано:</strong> ${schedule.total_booked}
                            </div>
                        `;
                        updateSubmitButton(true, peopleCount);
                    }
                } else {
                    scheduleInfo.innerHTML = `
                        <div style="background: #f8d7da; padding: 12px; border-radius: 8px; color: #721c24; border-left: 4px solid #dc3545;">
                            <strong>❌ Нет свободных мест на выбранную дату</strong><br>
                            <small>Доступно: ${schedule.available_seats} из ${schedule.max_people}</small>
                        </div>
                    `;
                    updateSubmitButton(false, peopleCount);
                }
            }
        }
    } catch (error) {
        console.error('Error updating availability:', error);
    }
}

// Запуск интервала обновления доступности
function startAvailabilityUpdates(scheduleId, peopleCount) {
    if (availabilityCheckInterval) {
        clearInterval(availabilityCheckInterval);
        availabilityCheckInterval = null;
    }
    
    if (scheduleId) {
        lastCheckedScheduleId = scheduleId;
        availabilityCheckInterval = setInterval(() => {
            const currentScheduleId = document.getElementById('id_schedule')?.value;
            const currentPeopleCount = document.getElementById('id_people')?.value;
            
            if (currentScheduleId === lastCheckedScheduleId) {
                updateAvailabilityInRealTime(currentScheduleId, currentPeopleCount);
            } else if (currentScheduleId) {
                lastCheckedScheduleId = currentScheduleId;
                updateAvailabilityInRealTime(currentScheduleId, currentPeopleCount);
            }
        }, 30000);
    }
}

// Прелоадер
function showPreloader() {
    let preloader = document.getElementById('customPreloader');
    if (preloader) preloader.remove();
    
    preloader = document.createElement('div');
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
        <div style="background: white; padding: 30px 40px; border-radius: 15px; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.3);">
            <div style="width: 50px; height: 50px; border: 4px solid #f0f9f0; border-top: 4px solid #71b378; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
            <div style="font-size: 16px; color: #2d5a2e; font-weight: bold;">🔍 Загрузка информации...</div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    document.body.appendChild(preloader);
}

function hidePreloader() {
    const preloader = document.getElementById('customPreloader');
    if (preloader) preloader.remove();
}

// Функция для получения CSRF токена
function getCSRFToken() {
    const cookieValue = document.cookie.match('(^|; )csrftoken=([^;]*)');
    return cookieValue ? cookieValue[2] : null;
}

// ============= AJAX ФУНКЦИИ =============

// Загрузка расписания при выборе тура
async function loadSchedule(tourId) {
    if (!tourId) {
        const scheduleGroup = document.getElementById('scheduleGroup');
        if (scheduleGroup) scheduleGroup.style.display = 'none';
        if (availabilityCheckInterval) {
            clearInterval(availabilityCheckInterval);
            availabilityCheckInterval = null;
        }
        return;
    }
    
    const scheduleSelect = document.getElementById('id_schedule');
    if (!scheduleSelect) return;
    
    scheduleSelect.innerHTML = '<option value="">🔄 Загрузка расписания...</option>';
    
    try {
        const response = await fetch(`/ajax/tour-details/?tour_id=${tourId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.success) {
            currentTourData = data.tour;
            displayTourInfo(data.tour);
            
            if (data.schedules && data.schedules.length > 0) {
                scheduleSelect.innerHTML = '<option value="">📅 Выберите дату тура</option>';
                
                data.schedules.forEach(schedule => {
                    const option = document.createElement('option');
                    option.value = schedule.id;
                    const seatsText = schedule.available_seats > 0 
                        ? ` ✅ свободно: ${schedule.available_seats} мест`
                        : ` ❌ НЕТ МЕСТ!`;
                    option.textContent = `${schedule.start_date} - ${schedule.end_date}${seatsText}`;
                    option.disabled = !schedule.is_available;
                    option.dataset.availableSeats = schedule.available_seats;
                    option.dataset.totalBooked = schedule.total_booked;
                    scheduleSelect.appendChild(option);
                });
                
                const scheduleGroup = document.getElementById('scheduleGroup');
                if (scheduleGroup) scheduleGroup.style.display = 'block';
                updateSubmitButton(false);
            } else {
                scheduleSelect.innerHTML = '<option value="">😔 Нет доступных дат</option>';
                const scheduleGroup = document.getElementById('scheduleGroup');
                if (scheduleGroup) scheduleGroup.style.display = 'block';
                updateSubmitButton(false);
                showToast('Нет доступных дат для этого тура', 'warning', 3000);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        scheduleSelect.innerHTML = '<option value="">❌ Ошибка загрузки</option>';
        showToast('Ошибка загрузки расписания', 'error', 3000);
    }
}

// Отображение информации о расписании при выборе даты
async function showScheduleInfo(scheduleId) {
    if (!scheduleId) {
        const scheduleInfo = document.getElementById('scheduleInfo');
        if (scheduleInfo) scheduleInfo.innerHTML = '';
        updateSubmitButton(false);
        if (availabilityCheckInterval) {
            clearInterval(availabilityCheckInterval);
            availabilityCheckInterval = null;
        }
        return;
    }
    
    const selectedOption = document.querySelector('#id_schedule option:checked');
    const peopleInput = document.getElementById('id_people');
    const peopleCount = peopleInput ? parseInt(peopleInput.value) : 0;
    
    if (selectedOption && selectedOption.dataset.availableSeats) {
        const availableSeats = parseInt(selectedOption.dataset.availableSeats);
        currentScheduleAvailableSeats = availableSeats;
        
        startAvailabilityUpdates(scheduleId, peopleCount > 0 ? peopleCount : null);
        await updateAvailabilityInRealTime(scheduleId, peopleCount > 0 ? peopleCount : null);
        
        const tourId = document.getElementById('id_tour')?.value;
        if (tourId && peopleCount > 0 && !isNaN(peopleCount)) {
            calculatePrice(tourId, peopleCount);
        }
    }
}

// Отображение полной информации о туре в блоке
function displayTourInfo(tour) {
    const infoText = document.getElementById('tourInfoText');
    if (!infoText) return;
    
    let imageHtml = '';
    if (tour.image_url) {
        imageHtml = `<img src="${tour.image_url}" alt="${escapeHtml(tour.title)}" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">`;
    }
    
    infoText.innerHTML = `
        ${imageHtml}
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between;">
            <div style="flex: 1;">
                <strong>📋 ${escapeHtml(tour.title)}</strong><br>
                <small>${escapeHtml(tour.description ? tour.description.substring(0, 150) : '')}...</small>
            </div>
            <div>
                ⏱ ${tour.duration} дней<br>
                💰 ${tour.price} руб/чел<br>
                👥 Макс: ${tour.max_people} чел.
            </div>
        </div>
        <div style="margin-top: 12px; text-align: center;">
            <button type="button" id="showFullInfoBtn" class="info-btn">📖 Подробнее о туре</button>
        </div>
    `;
    
    const fullInfoBtn = document.getElementById('showFullInfoBtn');
    if (fullInfoBtn) {
        fullInfoBtn.onclick = () => showFullTourInfo(tour);
    }
    
    toggleInfoBlock(true, true);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показ полной информации в модальном окне
function showFullTourInfo(tour) {
    const modal = document.getElementById('tourModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = tour.title;
    
    let imageHtml = '';
    if (tour.image_url) {
        imageHtml = `<img src="${tour.image_url}" alt="${escapeHtml(tour.title)}" style="width: 100%; border-radius: 8px; margin-bottom: 15px;">`;
    }
    
    modalBody.innerHTML = `
        ${imageHtml}
        <p><strong>📝 Описание:</strong></p>
        <p>${escapeHtml(tour.description || 'Описание отсутствует')}</p>
        <hr>
        <p>⏱ Длительность: ${tour.duration} дней</p>
        <p>💰 Цена: ${tour.price} руб/чел</p>
        <p>👥 Максимум: ${tour.max_people} чел.</p>
        <p>📊 Уже забронировано: ${tour.total_booked_all || 0} чел.</p>
    `;
    
    openModal(modal);
}

// Расчет стоимости
async function calculatePrice(tourId, peopleCount) {
    if (!tourId || !peopleCount || peopleCount <= 0) return;
    
    const priceBlock = document.getElementById('priceCalculation');
    if (!priceBlock) return;
    
    priceBlock.style.display = 'block';
    priceBlock.innerHTML = '🔄 Расчет стоимости...';
    
    try {
        const response = await fetch(`/ajax/calculate-price/?tour_id=${tourId}&people_count=${peopleCount}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            const calc = data.calculation;
            const totalPrice = calc.price_per_person * calc.people_count;
            
            let discountHtml = '';
            if (calc.discount && calc.discount > 0) {
                discountHtml = `<small style="color: #28a745;">✓ Скидка: ${calc.discount}%</small><br>`;
            }
            
            priceBlock.innerHTML = `
                <div style="background: #f0f9f0; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #71b378;">
                    <strong>💰 Итоговая стоимость:</strong>
                    <div style="font-size: 22px; font-weight: bold; margin-top: 8px; color: #71b378;">
                        ${totalPrice.toLocaleString()} ${calc.currency || 'руб'}
                    </div>
                    ${discountHtml}
                    <small>${calc.price_per_person.toLocaleString()} руб. × ${calc.people_count} чел.</small>
                </div>
            `;
        } else {
            priceBlock.innerHTML = `<div style="color: red;">❌ ${data.error || 'Ошибка расчета стоимости'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        priceBlock.innerHTML = `<div style="color: red;">❌ Ошибка расчета стоимости</div>`;
    }
}

// Функция проверки доступности мест
async function checkAvailability(scheduleId, peopleCount) {
    if (!scheduleId || !peopleCount || peopleCount <= 0) return false;
    
    try {
        const response = await fetch(`/ajax/schedule-availability/?schedule_id=${scheduleId}&people_count=${peopleCount}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        const scheduleInfo = document.getElementById('scheduleInfo');
        
        if (data.success && data.schedule) {
            const schedule = data.schedule;
            currentScheduleAvailableSeats = schedule.available_seats;
            
            if (schedule.is_available && schedule.available_seats >= peopleCount) {
                if (scheduleInfo) {
                    scheduleInfo.innerHTML = `
                        <div style="background: #d4edda; padding: 12px; border-radius: 8px; color: #155724; border-left: 4px solid #28a745;">
                            ✅ Доступно: ${schedule.available_seats} из ${schedule.max_people} мест<br>
                            ✅ Можно забронировать ${peopleCount} чел.<br>
                        </div>
                    `;
                }
                updateSubmitButton(true, peopleCount);
                return true;
            } else {
                if (scheduleInfo) {
                    scheduleInfo.innerHTML = `
                        <div style="background: #f8d7da; padding: 12px; border-radius: 8px; color: #721c24; border-left: 4px solid #dc3545;">
                            ❌ Недостаточно мест! Доступно: ${schedule.available_seats} из ${schedule.max_people}<br>
                        </div>
                    `;
                }
                updateSubmitButton(false, peopleCount);
                return false;
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking availability:', error);
        return false;
    }
}

// AJAX отправка формы
async function submitBookingForm(formData) {
    const response = await fetch('/book/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
}

// ============= ИНИЦИАЛИЗАЦИЯ =============
document.addEventListener('DOMContentLoaded', function() {
    const tourModal = document.getElementById('tourModal');
    const errorModal = document.getElementById('errorModal');
    const tourSelect = document.getElementById('id_tour');
    const scheduleSelect = document.getElementById('id_schedule');
    const peopleInput = document.getElementById('id_people');
    const bookingForm = document.getElementById('bookingForm');
    
    if (tourSelect) {
        tourSelect.addEventListener('change', function() {
            isSubmitting = false;
            loadSchedule(this.value);
            updateSubmitButton(false);
            const priceBlock = document.getElementById('priceCalculation');
            if (priceBlock) priceBlock.style.display = 'none';
            const scheduleInfo = document.getElementById('scheduleInfo');
            if (scheduleInfo) scheduleInfo.innerHTML = '';
        });
        
        if (tourSelect.value) {
            loadSchedule(tourSelect.value);
        }
    }
    
    if (scheduleSelect) {
        scheduleSelect.addEventListener('change', function() {
            showScheduleInfo(this.value);
        });
    }
    
    if (peopleInput) {
        let debounceTimer;
        
        peopleInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            
            const peopleCount = parseInt(this.value);
            const scheduleId = scheduleSelect ? scheduleSelect.value : null;
            const tourId = tourSelect ? tourSelect.value : null;
            const peopleErrorDiv = document.getElementById('peopleError');
            
            if (peopleErrorDiv) peopleErrorDiv.textContent = '';
            this.style.borderColor = '#ddd';
            
            if (isNaN(peopleCount) || this.value === '') {
                updateSubmitButton(false);
                const priceBlock = document.getElementById('priceCalculation');
                if (priceBlock) priceBlock.style.display = 'none';
                return;
            }
            
            if (peopleCount <= 0) {
                if (peopleErrorDiv) peopleErrorDiv.textContent = 'Количество человек должно быть больше нуля';
                this.style.borderColor = 'red';
                updateSubmitButton(false);
                return;
            }
            
            if (currentTourData && peopleCount > currentTourData.max_people) {
                if (peopleErrorDiv) peopleErrorDiv.textContent = `Максимум для этого тура: ${currentTourData.max_people} человек`;
                this.style.borderColor = 'red';
                updateSubmitButton(false);
                return;
            }
            
            if (scheduleId && peopleCount > 0) {
                debounceTimer = setTimeout(async () => {
                    const isAvailable = await checkAvailability(scheduleId, peopleCount);
                    if (tourId && isAvailable) {
                        await calculatePrice(tourId, peopleCount);
                    } else if (!isAvailable) {
                        const priceBlock = document.getElementById('priceCalculation');
                        if (priceBlock) priceBlock.style.display = 'none';
                    }
                }, 500);
            }
        });
    }
    
    // ОТПРАВКА ФОРМЫ - ПОЛНОСТЬЮ AJAX
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (isSubmitting) {
                showToast('Пожалуйста, подождите, идет обработка...', 'info', 2000);
                return;
            }
            
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            const scheduleId = scheduleSelect ? scheduleSelect.value : null;
            const peopleCount = peopleInput ? parseInt(peopleInput.value) : 0;
            const originalButtonText = submitButton.textContent;
            
            if (!scheduleId) {
                showToast('Пожалуйста, выберите дату тура', 'warning', 3000);
                return;
            }
            
            if (isNaN(peopleCount) || peopleCount <= 0) {
                showToast('Пожалуйста, укажите корректное количество человек', 'error', 3000);
                return;
            }
            
            isSubmitting = true;
            
            try {
                submitButton.disabled = true;
                submitButton.textContent = '⏳ Проверка доступности...';
                showPreloader();
                
                // Финальная проверка на сервере
                const checkResponse = await fetch(`/ajax/schedule-availability/?schedule_id=${scheduleId}&people_count=${peopleCount}`);
                
                if (!checkResponse.ok) {
                    throw new Error(`HTTP ${checkResponse.status}`);
                }
                
                const checkData = await checkResponse.json();
                
                if (checkData.success && checkData.schedule) {
                    if (checkData.schedule.is_available && checkData.schedule.available_seats >= peopleCount) {
                        submitButton.textContent = '✅ Отправка бронирования...';
                        
                        // AJAX отправка формы
                        const formData = new FormData(bookingForm);
                        const submitData = await submitBookingForm(formData);
                        
                        hidePreloader();
                        
                        if (submitData.success) {
                            showToast('✅ Бронирование успешно оформлено!', 'success', 5000);
                            
                            // Очищаем форму
                            bookingForm.reset();
                            updateSubmitButton(false);
                            
                            const scheduleInfoElem = document.getElementById('scheduleInfo');
                            if (scheduleInfoElem) scheduleInfoElem.innerHTML = '';
                            
                            const priceBlock = document.getElementById('priceCalculation');
                            if (priceBlock) priceBlock.style.display = 'none';
                            
                            // Перезагружаем расписание для обновления доступности
                            if (tourSelect && tourSelect.value) {
                                await loadSchedule(tourSelect.value);
                            }
                            
                            // Если есть redirect_url, перенаправляем
                            if (submitData.redirect_url) {
                                setTimeout(() => {
                                    window.location.href = submitData.redirect_url;
                                }, 2000);
                            }
                        } else {
                            showToast(submitData.error || 'Ошибка при бронировании', 'error', 4000);
                            submitButton.disabled = false;
                            submitButton.textContent = originalButtonText;
                            isSubmitting = false;
                        }
                    } else {
                        hidePreloader();
                        showToast(`❌ Недостаточно мест! Доступно: ${checkData.schedule.available_seats}`, 'error', 4000);
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                        updateSubmitButton(false);
                        isSubmitting = false;
                        
                        const scheduleInfoElem = document.getElementById('scheduleInfo');
                        if (scheduleInfoElem) {
                            scheduleInfoElem.innerHTML = `
                                <div style="background: #f8d7da; padding: 12px; border-radius: 8px; color: #721c24;">
                                    ❌ К сожалению, места закончились! Доступно: ${checkData.schedule.available_seats}
                                </div>
                            `;
                        }
                    }
                } else {
                    hidePreloader();
                    showToast('Ошибка проверки доступности. Попробуйте позже.', 'error', 3000);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    isSubmitting = false;
                }
            } catch (error) {
                console.error('Error:', error);
                hidePreloader();
                showToast('Ошибка соединения. Проверьте интернет и попробуйте снова.', 'error', 4000);
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                isSubmitting = false;
            }
        });
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.close, .close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (tourModal) closeModal(tourModal);
            if (errorModal) closeModal(errorModal);
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === tourModal) closeModal(tourModal);
        if (event.target === errorModal) closeModal(errorModal);
    });
    
    if (window.location.search.includes('success=1')) {
        showToast('✅ Бронирование успешно оформлено!', 'success', 5000);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    window.addEventListener('beforeunload', () => {
        if (availabilityCheckInterval) {
            clearInterval(availabilityCheckInterval);
        }
    });
});
