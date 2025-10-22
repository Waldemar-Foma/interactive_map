class NovgorodCraftQuest {
    constructor() {
        this.currentScreen = 'welcome';
        this.score = 0;
        this.completedLocations = new Set();
        this.currentLocation = null;
        this.playerCrafts = [];
        this.achievements = new Set();
        this.startTime = null;
        this.isLoading = true;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.showPreloader();
            this.initializeEventListeners();
            this.renderMap();
            this.showScreen('welcome');
            this.trackAchievement('first_visit');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Не удалось загрузить приложение. Пожалуйста, обновите страницу.');
        }
    }

    async showPreloader() {
        return new Promise((resolve) => {
            const preloader = document.getElementById('preloader');
            const progressFill = document.getElementById('preloader-progress');
            const progressText = document.getElementById('progress-text');
            const fortressFill = document.querySelector('.fortress-fill');
            
            let progress = 0;
            const targetProgress = 100;
            const duration = 3000;
            const interval = 30;
            const steps = duration / interval;
            const increment = targetProgress / steps;
            
            const animateProgress = () => {
                progress += increment;
                if (progress >= targetProgress) {
                    progress = targetProgress;
                    clearInterval(animation);
                    
                    progressFill.style.width = '100%';
                    progressText.textContent = '100%';
                    fortressFill.style.strokeDashoffset = '0';
                    
                    setTimeout(() => {
                        preloader.classList.add('hidden');
                        setTimeout(() => {
                            preloader.style.display = 'none';
                            resolve();
                        }, 500);
                    }, 500);
                } else {
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `${Math.round(progress)}%`;
                    
                    const fortressProgress = 400 - (progress / 100) * 400;
                    fortressFill.style.strokeDashoffset = fortressProgress;
                }
            };
            
            const animation = setInterval(animateProgress, interval);
        });
    }

    initializeEventListeners() {
        // Навигация между экранами
        document.getElementById('start-quest').addEventListener('click', () => {
            this.startTime = new Date();
            this.showScreen('quest');
        });

        document.getElementById('restart-quest').addEventListener('click', () => {
            this.restartQuest();
        });

        // Навигация по вкладкам
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Модальные окна
        document.getElementById('show-rules').addEventListener('click', () => {
            this.showModal('rules-modal');
        });

        document.getElementById('close-rules').addEventListener('click', () => {
            this.hideModal('rules-modal');
        });

        document.getElementById('understand-rules').addEventListener('click', () => {
            this.hideModal('rules-modal');
        });

        // Локации и задания
        document.getElementById('start-task').addEventListener('click', () => {
            this.showTask();
        });

        document.getElementById('visit-workshop').addEventListener('click', () => {
            this.showWorkshop();
        });

        document.getElementById('submit-task').addEventListener('click', () => {
            this.checkTaskAnswer();
        });

        document.getElementById('close-location').addEventListener('click', () => {
            this.hideModal('location-modal');
        });

        document.getElementById('close-task').addEventListener('click', () => {
            this.hideModal('task-modal');
        });

        document.getElementById('close-workshop').addEventListener('click', () => {
            this.hideModal('workshop-modal');
        });

        // Общие закрытия модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Кнопка поделиться результатами
        document.getElementById('share-results').addEventListener('click', () => {
            this.shareResults();
        });

        // Кнопка узнать больше
        document.getElementById('show-features').addEventListener('click', () => {
            this.showModal('rules-modal');
        });
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;

        if (screenName === 'quest') {
            this.updateProgressDisplay();
            this.renderProgressTab();
            this.renderCraftsTab();
        }
    }

    switchTab(tabName) {
        // Обновляем активные кнопки навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Показываем соответствующую вкладку
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Обновляем контент вкладки при необходимости
        if (tabName === 'progress') {
            this.renderProgressTab();
        } else if (tabName === 'crafts') {
            this.renderCraftsTab();
        }
    }

    renderMap() {
        const map = document.getElementById('interactive-map');
        
        // Очищаем только маркеры, оставляя изображение
        const markers = map.querySelectorAll('.location-marker');
        markers.forEach(marker => marker.remove());

        questData.locations.forEach(location => {
            const marker = this.createLocationMarker(location);
            map.appendChild(marker);
        });
    }

    createLocationMarker(location) {
        const marker = document.createElement('div');
        marker.className = 'location-marker active';
        marker.dataset.locationId = location.id;
        marker.dataset.locationName = location.name;
        
        // Устанавливаем позицию на основе процентов
        marker.style.left = `${location.position.x}%`;
        marker.style.top = `${location.position.y}%`;
        
        // Добавляем номер локации
        const number = document.createElement('span');
        number.textContent = location.id;
        number.style.cssText = `
            color: white;
            font-size: 12px;
            font-weight: bold;
            position: relative;
            z-index: 2;
        `;
        marker.appendChild(number);

        // Обновляем состояние маркера
        this.updateMarkerState(marker, location.id);

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showLocationInfo(location.id);
        });

        return marker;
    }

    updateMarkerState(marker, locationId) {
        marker.classList.remove('active', 'completed', 'current');
        
        if (this.completedLocations.has(locationId)) {
            marker.classList.add('completed');
        } else if (this.currentLocation && this.currentLocation.id === locationId) {
            marker.classList.add('current');
        } else {
            marker.classList.add('active');
        }
    }

    showLocationInfo(locationId) {
        const location = questData.getLocationById(locationId);
        if (!location) return;

        this.currentLocation = location;

        // Обновляем маркеры на карте
        this.renderMap();

        document.getElementById('location-title').textContent = location.name;
        
        const content = this.createLocationContent(location);
        document.getElementById('location-content').innerHTML = content;

        // Показываем/скрываем кнопки в зависимости от состояния
        const isCompleted = this.completedLocations.has(locationId);
        document.getElementById('start-task').style.display = isCompleted ? 'none' : 'block';
        document.getElementById('visit-workshop').style.display = isCompleted ? 'none' : 'block';

        this.showModal('location-modal');
    }

    createLocationContent(location) {
        const isCompleted = this.completedLocations.has(location.id);
        
        return `
            <div class="location-info">
                <div class="location-description">
                    <p>${location.description}</p>
                </div>
                
                <div class="location-historical">
                    <h4>Исторический контекст</h4>
                    <p>${location.historicalContext}</p>
                </div>
                
                <div class="location-facts">
                    <h4>Интересные факты:</h4>
                    <ul>
                        ${location.facts.map(fact => `<li>${fact}</li>`).join('')}
                    </ul>
                </div>
                
                ${isCompleted ? `
                    <div class="location-completed">
                        <p>✅ Вы уже освоили это ремесло и создали ${location.workshop.result}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    showTask() {
        if (!this.currentLocation) return;

        const task = this.currentLocation.task;
        document.getElementById('task-location-name').textContent = this.currentLocation.name;
        document.getElementById('task-content').innerHTML = this.createTaskContent(task);
        
        // Добавляем обработчики для вариантов ответа
        setTimeout(() => {
            document.querySelectorAll('.puzzle-option').forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.puzzle-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    option.classList.add('selected');
                });
            });
        }, 100);
        
        this.hideModal('location-modal');
        this.showModal('task-modal');
    }

    createTaskContent(task) {
        switch (task.type) {
            case 'puzzle':
                return `
                    <div class="task-puzzle">
                        <div class="task-question">
                            <p>${task.question}</p>
                            ${task.hint ? `<div class="task-hint">💡 Подсказка: ${task.hint}</div>` : ''}
                        </div>
                        <div class="puzzle-options">
                            ${task.options.map((option, index) => `
                                <div class="puzzle-option" data-answer="${index}">
                                    ${option}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            default:
                return '<p>Тип задания не поддерживается</p>';
        }
    }

    checkTaskAnswer() {
        const selectedOption = document.querySelector('.puzzle-option.selected');
        if (!selectedOption) {
            this.showNotification('Пожалуйста, выберите ответ!', 'warning');
            return;
        }

        const selectedAnswer = parseInt(selectedOption.dataset.answer);
        const task = this.currentLocation.task;
        const isCorrect = selectedAnswer === task.correctAnswer;

        if (isCorrect) {
            this.completeTask(task);
        } else {
            this.showNotification('Неверный ответ! Попробуйте еще раз.', 'error');
        }
    }

    completeTask(task) {
        this.addScore(task.points);
        this.showNotification(`Правильно! +${task.points} баллов`, 'success');
        this.hideModal('task-modal');
        
        // Показываем кнопку мастерской
        document.getElementById('visit-workshop').style.display = 'block';
        this.showModal('location-modal');
    }

    showWorkshop() {
        if (!this.currentLocation) return;

        const workshop = this.currentLocation.workshop;
        document.getElementById('workshop-title').textContent = workshop.title;
        document.getElementById('workshop-content').innerHTML = this.createWorkshopContent(workshop);
        
        this.hideModal('location-modal');
        this.showModal('workshop-modal');
        
        this.initializeCrafting();
    }

    createWorkshopContent(workshop) {
        return `
            <div class="workshop-info">
                <div class="workshop-instruction">
                    <h4>Инструкция</h4>
                    <p>${workshop.instruction}</p>
                </div>
                
                <div class="workshop-details">
                    <div class="detail-item">
                        <strong>Время:</strong> ${workshop.timeRequired}
                    </div>
                    <div class="detail-item">
                        <strong>Материалы:</strong> ${workshop.materials.join(', ')}
                    </div>
                    <div class="detail-item">
                        <strong>Награда:</strong> ${workshop.points} баллов
                    </div>
                </div>
                
                <div class="crafting-interface">
                    <h4>Создайте ваше изделие</h4>
                    <canvas id="craft-canvas" width="600" height="400" class="craft-canvas"></canvas>
                    <div class="crafting-controls">
                        <button id="reset-craft" class="btn btn-secondary">Очистить</button>
                        <button id="complete-craft" class="btn btn-primary">Завершить изделие</button>
                    </div>
                </div>
            </div>
        `;
    }

    initializeCrafting() {
        const canvas = document.getElementById('craft-canvas');
        const ctx = canvas.getContext('2d');
        
        // Очищаем canvas и устанавливаем стили
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        const startDrawing = (e) => {
            isDrawing = true;
            [lastX, lastY] = this.getMousePos(canvas, e);
        };

        const draw = (e) => {
            if (!isDrawing) return;
            
            const [x, y] = this.getMousePos(canvas, e);
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            [lastX, lastY] = [x, y];
        };

        const stopDrawing = () => {
            isDrawing = false;
        };

        // Добавляем обработчики событий
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Кнопка очистки
        document.getElementById('reset-craft').addEventListener('click', () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });

        // Кнопка завершения
        document.getElementById('complete-craft').addEventListener('click', () => {
            this.completeCrafting();
        });
    }

    getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return [
            (evt.clientX - rect.left) * scaleX,
            (evt.clientY - rect.top) * scaleY
        ];
    }

    completeCrafting() {
        const workshop = this.currentLocation.workshop;
        
        this.addScore(workshop.points);
        this.completedLocations.add(this.currentLocation.id);
        this.playerCrafts.push({
            name: workshop.result,
            location: this.currentLocation.name,
            points: workshop.points,
            timestamp: new Date().toLocaleDateString('ru-RU')
        });

        this.trackAchievement('first_craft');
        
        if (this.playerCrafts.length === questData.locations.length) {
            this.trackAchievement('craft_master');
        }

        this.showNotification(`Поздравляем! Вы создали: ${workshop.result} (+${workshop.points} баллов)`, 'success');
        
        this.hideModal('workshop-modal');
        this.renderMap();
        this.updateProgressDisplay();
        
        // Проверяем завершение квеста
        if (this.completedLocations.size === questData.locations.length) {
            setTimeout(() => this.showCompletionScreen(), 1000);
        }
    }

    addScore(points) {
        this.score += points;
        document.getElementById('player-score').textContent = this.score;
        this.updateProgressDisplay();

        // Проверяем достижения по баллам
        if (this.score >= questData.rewards.maxScore) {
            this.trackAchievement('perfect_score');
        }
    }

    updateProgressDisplay() {
        const progress = (this.completedLocations.size / questData.locations.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-percent').textContent = `${Math.round(progress)}%`;
        document.getElementById('completed-count').textContent = `${this.completedLocations.size}/${questData.locations.length}`;
    }

    renderProgressTab() {
        const progressList = document.getElementById('progress-list');
        const progressHTML = questData.locations.map(location => {
            const isCompleted = this.completedLocations.has(location.id);
            const totalPoints = location.task.points + location.workshop.points;
            
            return `
                <div class="progress-item ${isCompleted ? 'completed' : ''}">
                    <div class="progress-icon">
                        ${isCompleted ? '✅' : '⏳'}
                    </div>
                    <div class="progress-info">
                        <h4>${location.name}</h4>
                        <p>${isCompleted ? 'Освоено' : 'Еще предстоит освоить'}</p>
                    </div>
                    <div class="progress-score">
                        ${isCompleted ? `+${totalPoints} баллов` : `до ${totalPoints} баллов`}
                    </div>
                </div>
            `;
        }).join('');

        progressList.innerHTML = progressHTML;
    }

    renderCraftsTab() {
        const craftsGallery = document.getElementById('crafts-gallery');
        
        if (this.playerCrafts.length === 0) {
            craftsGallery.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚒️</div>
                    <h3>Пока нет созданных изделий</h3>
                    <p>Посетите мастерские на карте, чтобы создать свои первые изделия</p>
                </div>
            `;
            return;
        }

        const craftsHTML = this.playerCrafts.map(craft => `
            <div class="craft-card">
                <div class="craft-icon">🎁</div>
                <div class="craft-info">
                    <h4>${craft.name}</h4>
                    <p>${craft.location}</p>
                    <span class="craft-date">Создано: ${craft.timestamp}</span>
                </div>
                <div class="craft-score">+${craft.points}</div>
            </div>
        `).join('');

        craftsGallery.innerHTML = craftsHTML;
    }

    showCompletionScreen() {
        const level = questData.calculateLevel(this.score);
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('completed-stops').textContent = this.completedLocations.size;
        document.getElementById('crafts-count').textContent = this.playerCrafts.length;

        // Создаем список наград
        const rewardsList = document.getElementById('rewards-list');
        rewardsList.innerHTML = '';

        // Уровень игрока
        const levelReward = document.createElement('div');
        levelReward.className = 'reward-item';
        levelReward.innerHTML = `
            <span>${level.score <= this.score ? '🏆' : '⭐'}</span>
            <div>
                <strong>${level.title}</strong>
                <p>${level.description}</p>
            </div>
        `;
        rewardsList.appendChild(levelReward);

        // Сертификат
        const certificateItem = document.createElement('div');
        certificateItem.className = 'reward-item';
        certificateItem.innerHTML = `
            <span>📜</span>
            <div>
                <strong>${questData.rewards.certificate}</strong>
                <p>Официальное подтверждение освоения ремесел</p>
            </div>
        `;
        rewardsList.appendChild(certificateItem);

        // Созданные изделия
        this.playerCrafts.forEach(craft => {
            const craftItem = document.createElement('div');
            craftItem.className = 'reward-item';
            craftItem.innerHTML = `
                <span>🎁</span>
                <div>
                    <strong>${craft.name}</strong>
                    <p>${craft.location} - ${craft.points} баллов</p>
                </div>
            `;
            rewardsList.appendChild(craftItem);
        });

        // Достижения
        this.achievements.forEach(achievementId => {
            const achievement = questData.getAchievementById(achievementId);
            if (achievement) {
                const achievementItem = document.createElement('div');
                achievementItem.className = 'reward-item';
                achievementItem.innerHTML = `
                    <span>${achievement.icon}</span>
                    <div>
                        <strong>${achievement.name}</strong>
                        <p>${achievement.description}</p>
                    </div>
                `;
                rewardsList.appendChild(achievementItem);
            }
        });

        this.showScreen('completion');
    }

    trackAchievement(achievementId) {
        this.achievements.add(achievementId);
        const achievement = questData.getAchievementById(achievementId);
        if (achievement) {
            this.showNotification(`Достижение получено: ${achievement.name}`, 'success');
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showNotification(message, type = 'info') {
        // Удаляем существующие уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        // Автоматическое скрытие через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    getNotificationColor(type) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || colors.info;
    }

    shareResults() {
        const results = {
            score: this.score,
            crafts: this.playerCrafts.length,
            completed: this.completedLocations.size
        };

        const shareText = `Я завершил(а) ремесленный квест Великого Новгорода! 🏆
Набрано баллов: ${results.score}
Создано изделий: ${results.crafts}
Пройдено остановок: ${results.completed}

Присоединяйтесь к путешествию в историю!`;

        if (navigator.share) {
            navigator.share({
                title: 'Мои результаты ремесленного квеста',
                text: shareText,
                url: window.location.href
            }).catch(() => {
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(shareText) {
        navigator.clipboard.writeText(shareText).then(() => {
            this.showNotification('Результаты скопированы в буфер обмена!', 'success');
        }).catch(() => {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Результаты скопированы в буфер обмена!', 'success');
        });
    }

    restartQuest() {
        if (!confirm('Вы уверены, что хотите начать квест заново? Весь прогресс будет потерян.')) {
            return;
        }

        this.score = 0;
        this.completedLocations.clear();
        this.currentLocation = null;
        this.playerCrafts = [];
        this.achievements.clear();
        this.startTime = null;
        
        document.getElementById('player-score').textContent = '0';
        this.updateProgressDisplay();
        
        this.renderMap();
        this.renderProgressTab();
        this.renderCraftsTab();
        
        this.showScreen('welcome');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Добавляем стили для уведомлений и анимаций
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
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
    
    .empty-state {
        text-align: center;
        padding: 3rem 2rem;
        color: var(--text-secondary);
    }
    
    .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .empty-state h3 {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }
    
    .progress-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--border);
    }
    
    .progress-item:last-child {
        border-bottom: none;
    }
    
    .progress-item.completed {
        background: var(--background);
    }
    
    .progress-icon {
        font-size: 1.5rem;
    }
    
    .progress-info {
        flex: 1;
    }
    
    .progress-info h4 {
        margin-bottom: 0.25rem;
        color: var(--text-primary);
    }
    
    .progress-info p {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }
    
    .progress-score {
        font-weight: 600;
        color: var(--secondary);
    }
    
    .craft-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--background);
        border-radius: var(--radius-sm);
        margin-bottom: 0.5rem;
    }
    
    .craft-icon {
        font-size: 1.5rem;
    }
    
    .craft-info {
        flex: 1;
    }
    
    .craft-info h4 {
        margin-bottom: 0.25rem;
        color: var(--text-primary);
    }
    
    .craft-info p {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
    }
    
    .craft-date {
        font-size: 0.75rem;
        color: var(--text-light);
    }
    
    .craft-score {
        font-weight: 600;
        color: var(--success);
    }
    
    .task-hint {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: var(--radius-sm);
        padding: 0.75rem;
        margin: 1rem 0;
        font-size: 0.875rem;
        color: #856404;
    }
    
    .workshop-details {
        background: var(--background);
        padding: 1rem;
        border-radius: var(--radius-sm);
        margin: 1rem 0;
    }
    
    .detail-item {
        margin-bottom: 0.5rem;
    }
    
    .detail-item:last-child {
        margin-bottom: 0;
    }
    
    .crafting-controls {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 1rem;
    }
    
    .location-historical {
        background: var(--background);
        padding: 1rem;
        border-radius: var(--radius-sm);
        margin: 1rem 0;
    }
    
    .location-historical h4 {
        margin-bottom: 0.5rem;
        color: var(--primary);
    }
    
    .location-completed {
        background: #d5f4e6;
        border: 1px solid #27ae60;
        border-radius: var(--radius-sm);
        padding: 1rem;
        margin-top: 1rem;
        text-align: center;
        color: #155724;
    }
`;
document.head.appendChild(notificationStyles);

// Инициализация приложения когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    new NovgorodCraftQuest();
});