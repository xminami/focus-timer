let startTime = null;
let timerInterval = null;
let pausedTime = 0;
let isPaused = false;
let dailyTotal = 0;
let records = [];
let dailyFocusCount = 0;  // 记录超过25分钟的专注次数
let moodCounts = {
    great: 0,
    good: 0,
    meh: 0,
    bad: 0
};
let monthlyStats = {};

const timer = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const taskInput = document.getElementById('taskInput');
const recordsTable = document.getElementById('recordsTable');
const dailySummary = document.getElementById('dailySummary');

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
stopBtn.addEventListener('click', stopTimer);

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!startTime) {
        startTime = Date.now() - pausedTime;
        timerInterval = setInterval(updateTimer, 1000);
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
    }
}

function pauseTimer() {
    if (!isPaused) {
        clearInterval(timerInterval);
        pausedTime = Date.now() - startTime;
        isPaused = true;
        pauseBtn.textContent = 'Resume';
    } else {
        startTime = Date.now() - pausedTime;
        timerInterval = setInterval(updateTimer, 1000);
        isPaused = false;
        pauseBtn.textContent = 'Pause';
    }
}

function stopTimer() {
    if (startTime) {
        const duration = Date.now() - startTime;  // 1. 先计算持续时间
        clearInterval(timerInterval);  // 2. 停止计时器
        resetTimer();  // 3. 重置界面
        addRecord(duration);  // 4. 最后记录数据
    }
}

function updateTimer() {
    const currentTime = Date.now() - startTime;
    timer.textContent = formatTime(currentTime);
}

function addRecord(duration) {
    const row = recordsTable.insertRow();
    const taskCell = row.insertCell();
    const startTimeCell = row.insertCell();
    const durationCell = row.insertCell();

    const taskName = taskInput.value || 'Unnamed Task';
    const startTimeString = new Date(startTime).toLocaleTimeString();
    const durationString = formatTime(duration);

    taskCell.textContent = taskName;
    startTimeCell.textContent = startTimeString;
    durationCell.textContent = durationString;

    if (duration >= 25 * 60 * 1000) {
        dailyFocusCount++;
        row.style.backgroundColor = '#e8f5e9';
    }

    records.push({
        task: taskName,
        startTime: startTimeString,
        duration: durationString,
        durationMs: duration,
        isLongFocus: duration >= 25 * 60 * 1000
    });

    dailyTotal += duration;
    updateDailySummary();
    updateMonthlyStats(duration);
    saveData();
}

function updateDailySummary() {
    const hours = Math.floor(dailyTotal / (1000 * 60 * 60));
    const minutes = Math.floor((dailyTotal % (1000 * 60 * 60)) / (1000 * 60));
    dailySummary.textContent = `Total Focus Time: ${hours}h ${minutes}m | Effective Focus Sessions (≥25min): ${dailyFocusCount}`;
}

function resetTimer() {
    startTime = null;
    pausedTime = 0;
    isPaused = false;
    timer.textContent = '00:00:00';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    taskInput.value = '';
}

// 加载保存的数据
function loadSavedData() {
    const today = new Date().toLocaleDateString();
    const savedData = JSON.parse(localStorage.getItem('timerData') || '{}');
    
    if (savedData.date === today) {
        // 如果是同一天，加载保存的数据
        dailyTotal = savedData.dailyTotal || 0;
        records = savedData.records || [];
        dailyFocusCount = savedData.dailyFocusCount || 0;
        moodCounts = savedData.moodCounts || {
            great: 0,
            good: 0,
            meh: 0,
            bad: 0
        };
        monthlyStats = savedData.monthlyStats || {};
        
        // 更新心情计数显示
        updateMoodCounts();
        
        // 重新显示所有记录
        records.forEach(record => {
            const row = recordsTable.insertRow();
            const taskCell = row.insertCell();
            const startTimeCell = row.insertCell();
            const durationCell = row.insertCell();

            taskCell.textContent = record.task;
            startTimeCell.textContent = record.startTime;
            durationCell.textContent = record.duration;

            // 恢复长时间专注记录的背景色
            if (record.isLongFocus) {
                row.style.backgroundColor = '#e8f5e9';
            }
        });
        
        updateDailySummary();
        // 延迟调用 updateMonthlyChart
        setTimeout(updateMonthlyChart, 100);
    } else {
        // 如果是新的一天，清除之前的数据
        localStorage.removeItem('timerData');
        dailyFocusCount = 0;
        moodCounts = {
            great: 0,
            good: 0,
            meh: 0,
            bad: 0
        };
        monthlyStats = {};
    }
}

// 保存数据到本地存储
function saveData() {
    const today = new Date().toLocaleDateString();
    const dataToSave = {
        date: today,
        dailyTotal: dailyTotal,
        records: records,
        dailyFocusCount: dailyFocusCount,
        moodCounts: moodCounts,
        monthlyStats: monthlyStats
    };
    localStorage.setItem('timerData', JSON.stringify(dataToSave));
}

// 修改 setupMoodButtons 函数
function setupMoodButtons() {
    const moodButtons = document.querySelectorAll('.mood-btn');
    console.log('Found mood buttons:', moodButtons.length); // 检查是否找到按钮
    
    moodButtons.forEach(button => {
        button.onclick = function() {
            const mood = this.dataset.mood;
            moodCounts[mood]++;
            console.log('Updated moodCounts:', moodCounts); // 检查计数是否更新
            
            // 直接更新显示
            const countSpan = document.getElementById(`${mood}-count`);
            console.log('Count element:', countSpan); // 检查是否找到计数元素
            if (countSpan) {
                countSpan.textContent = moodCounts[mood];
                console.log('Updated display for', mood, 'to', moodCounts[mood]);
            }
            
            saveData();  // 保存数据，包括月度统计
            updateMonthlyChart();  // 更新图表显示
            
            // 检查 localStorage
            const savedData = JSON.parse(localStorage.getItem('timerData') || '{}');
            console.log('Saved data:', savedData);
            
            // 动画效果
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        };
    });
}

// 修改 updateMoodCounts 函数
function updateMoodCounts() {
    Object.keys(moodCounts).forEach(mood => {
        const countSpan = document.getElementById(`${mood}-count`);
        if (countSpan) {
            countSpan.textContent = moodCounts[mood];
        }
    });
}

// 修改 updateMonthlyStats 函数，添加心情统计
function updateMonthlyStats(duration) {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    const dayKey = today.getDate().toString();
    
    // 初始化月度数据
    if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
            totalTime: 0,
            focusCount: 0,
            dailyStats: {},
            dailyMoods: {} // 改为记录每日主要心情
        };
    }

    // 初始化日数据
    if (!monthlyStats[monthKey].dailyStats[dayKey]) {
        monthlyStats[monthKey].dailyStats[dayKey] = {
            totalTime: 0,
            focusCount: 0
        };
    }

    // 更新时间和专注次数
    if (duration) {
        monthlyStats[monthKey].totalTime += duration;
        monthlyStats[monthKey].dailyStats[dayKey].totalTime += duration;

        if (duration >= 25 * 60 * 1000) {
            monthlyStats[monthKey].focusCount++;
            monthlyStats[monthKey].dailyStats[dayKey].focusCount++;
        }
    }

    // 更新当日主要心情（选取计数最高的）
    const maxMood = Object.entries(moodCounts).reduce((max, [mood, count]) => {
        return count > max.count ? {mood, count} : max;
    }, {mood: null, count: -1});

    if (maxMood.count > 0) {
        monthlyStats[monthKey].dailyMoods[dayKey] = maxMood;
    }

    saveData();
    updateMonthlyChart();
}

// 修改 updateMonthlyChart 函数，添加心情统计显示
function updateMonthlyChart() {
    // 检查 Chart 是否已加载
    if (typeof Chart === 'undefined') {
        console.log('Chart.js not loaded yet');
        return;
    }

    const ctx = document.getElementById('monthlyChart');
    if (!ctx) {
        console.log('Chart canvas not found');
        return;
    }
    
    try {
        // 如果已经存在图表，先销毁它
        if (window.monthlyChart && typeof window.monthlyChart.destroy === 'function') {
            window.monthlyChart.destroy();
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthData = monthlyStats[currentMonth] || { dailyStats: {} };
        
        const days = Array.from({ length: 31 }, (_, i) => i + 1);
        const timeData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || { totalTime: 0 };
            return Math.round(dayStats.totalTime / (1000 * 60 * 60) * 10) / 10; // 转换为小时，保留一位小数
        });
        
        const focusData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || { focusCount: 0 };
            return dayStats.focusCount;
        });

        window.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Focus Time (hours)',
                        data: timeData,
                        backgroundColor: 'rgba(33, 150, 243, 0.5)',
                        borderColor: 'rgba(33, 150, 243, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Effective Sessions',
                        data: focusData,
                        backgroundColor: 'rgba(76, 175, 80, 0.5)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            text: 'Date'
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            text: 'Focus Time (hours)'
                        },
                        min: 0,  // 设置最小值
                        ticks: {
                            stepSize: 1  // 设置步长为1小时
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            text: 'Effective Sessions'
                        },
                        min: 0,  // 设置最小值
                        ticks: {
                            stepSize: 1  // 设置步长为1次
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        text: 'Monthly Statistics'
                    }
                }
            }
        });

        // 修改心情统计显示
        if (monthData && monthData.dailyMoods) {
            const moodEmojis = {
                great: '😊',
                good: '🙂',
                meh: '😐',
                bad: '😞'
            };

            const moodStatsHtml = `
                <div class="mood-stats">
                    <h3>Monthly Mood Records</h3>
                    <ul>
                        ${Object.entries(monthData.dailyMoods)
                            .map(([day, {mood, count}]) => 
                                `<li>Day ${day}: ${moodEmojis[mood]} (${count} times)</li>`
                            )
                            .join('')}
                    </ul>
                </div>
            `;
            
            // 在图表下方显示心情统计
            const chartContainer = document.querySelector('.chart-container');
            let moodStatsDiv = document.querySelector('.mood-stats');
            if (!moodStatsDiv) {
                chartContainer.insertAdjacentHTML('afterend', moodStatsHtml);
            } else {
                moodStatsDiv.outerHTML = moodStatsHtml;
            }
        }
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

// 保留导出/导入功能
function exportData() {
    const data = localStorage.getItem('timerData');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-timer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            localStorage.setItem('timerData', JSON.stringify(data));
            loadSavedData();  // 重新加载数据
            alert('Data imported successfully!');
        } catch (error) {
            alert('Import failed: Invalid data format');
        }
    };
    reader.readAsText(file);
}

// 添加自动重置功能
function setupAutoReset() {
    // 计算距离下一个凌晨0点的毫秒数
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeToMidnight = tomorrow - now;

    // 设置定时器
    setTimeout(() => {
        // 重置数据
        localStorage.removeItem('timerData');
        dailyFocusCount = 0;
        moodCounts = {
            great: 0,
            good: 0,
            meh: 0,
            bad: 0
        };
        
        // 更新显示
        updateMoodCounts();
        updateDailySummary();
        recordsTable.innerHTML = '';  // 清空今日记录表格
        
        // 设置下一天的定时器
        setupAutoReset();
    }, timeToMidnight);
}

// 在页面加载时启动自动重置
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    setupMoodButtons();
    setupAutoReset();
}); 