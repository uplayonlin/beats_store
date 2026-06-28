//Всплывающее уведомление
function showWorkInProgress() {
 const toast = new bootstrap.Toast(document.getElementById('workToast'));
 toast.show();
}
document.addEventListener('DOMContentLoaded', function() {
 const elementsToAnimate = [
        { selector: '.mycardmargin:nth-of-type(1)', delay: 500 },
        { selector: '.mycardmargin:nth-of-type(2)', delay: 1000 },
        { selector: '.audio-player', delay: 1500 }
    ];
    
    elementsToAnimate.forEach(item => {
        const element = document.querySelector(item.selector);
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'all 0.8s ease';
            
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, item.delay);
        }
    });
 // Элементы плеера
 const audioPlayer = document.querySelector('.audio-player');
 const audio = new Audio();
 const playBtn = document.getElementById('play-btn');
 const prevBtn = document.getElementById('prev-btn');
 const nextBtn = document.getElementById('next-btn');
 const progressBar = document.getElementById('progress-bar');
 const currentTimeEl = document.getElementById('current-time');
 const durationEl = document.getElementById('duration');
 const volumeBar = document.getElementById('volume-bar');
 const trackTitle = document.getElementById('track-title');
 const trackArtist = document.getElementById('track-artist');
 const playlist = document.getElementById('playlist');
 
 // Плейлист
 const songs = [
 {
 title: 'hips',
 artist: '@ariawave',
 src: 'source/audio/hips.mp3',
 cover: 'source/images/hips.png',
 duration: '1:35'
 },
 {
 title: 'jerk',
 artist: '@ariawave',
 src: 'source/audio/jerk.mp3',
 cover: 'source/images/jerk.png',
 duration: '2:30'
 },
 {
 title: 'mne poxui (remix by @ariawave)',
 artist: 'FACE',
 src: 'source/audio/facepoxui.mp3',
 cover: 'source/images/facemnepoxui.png',
 duration: '1:35'
 }
 ];
 
 let currentSongIndex = 0;
 let isPlaying = false;
 
 // Инициализация плеера
 function initPlayer() {
 renderPlaylist();
 loadSong(currentSongIndex);
 
 // Установка громкости по умолчанию
 audio.volume = volumeBar.value;
 }
 
 // Загрузка песни
 function loadSong(index) {
 const song = songs[index];
 audio.src = song.src;
 trackTitle.textContent = song.title;
 trackArtist.textContent = song.artist;
 
 // Обновление активного элемента в плейлисте
 updateActivePlaylistItem(index);
 }
 
 // Воспроизведение песни
 function playSong() {
 isPlaying = true;
 audio.play();
 playBtn.innerHTML = '<i class="fas fa-pause"></i>';
 playBtn.classList.add('playing');
 }
 
 // Пауза
 function pauseSong() {
 isPlaying = false;
 audio.pause();
 playBtn.innerHTML = '<i class="fas fa-play"></i>';
 playBtn.classList.remove('playing');
 }
 
 // Предыдущая песня
 function prevSong() {
 currentSongIndex--;
 if (currentSongIndex < 0) {
 currentSongIndex = songs.length - 1;
 }
 loadSong(currentSongIndex);
 if (isPlaying) {
 playSong();
 }
 }
 
 // Следующая песня
 function nextSong() {
 currentSongIndex++;
 if (currentSongIndex > songs.length - 1) {
 currentSongIndex = 0;
 }
 loadSong(currentSongIndex);
 if (isPlaying) {
 playSong();
 }
 }
 
 // Обновление прогресс-бара
 function updateProgressBar() {
 const { currentTime, duration } = audio;
 const progressPercent = (currentTime / duration) * 100;
 progressBar.value = progressPercent;
 
 // Форматирование времени
 currentTimeEl.textContent = formatTime(currentTime);
 
 // Автоматический переход к следующей песне
 if (duration && currentTime >= duration - 0.5) {
 nextSong();
 }
 }
 
 // Установка прогресса песни
 function setProgress(e) {
 const width = this.clientWidth;
 const clickX = e.offsetX;
 const duration = audio.duration;
 audio.currentTime = (clickX / width) * duration;
 }
 
 // Форматирование времени (минуты:секунды)
 function formatTime(seconds) {
 const mins = Math.floor(seconds / 60);
 const secs = Math.floor(seconds % 60);
 return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
 }
 
 // Установка громкости
 function setVolume() {
 audio.volume = this.value;
 }
 
 // Рендеринг плейлиста
 function renderPlaylist() {
    playlist.innerHTML = '';
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
        li.className = 'playlist-item'; // Добавляем класс
        li.innerHTML = `
            <img src="${song.cover}" alt="${song.title}" class="playlist-cover" 
                 onerror="this.src='source/images/default-cover.jpg'">
            <div class="playlist-info">
                <div class="playlist-title">${song.title}</div>
                <div class="playlist-artist">${song.artist}</div>
            </div>
            <span class="song-duration">${song.duration}</span>
        `;
        
        li.addEventListener('click', () => {
            currentSongIndex = index;
            loadSong(currentSongIndex);
            playSong();
        });
        
        playlist.appendChild(li);
    });
 }
 
 // Обновление активного элемента в плейлисте
 function updateActivePlaylistItem(index) {
 const items = playlist.querySelectorAll('li');
 items.forEach(item => item.classList.remove('playing'));
 if (items[index]) {
 items[index].classList.add('playing');
 }
 }
 
 // Обработчики событий
 playBtn.addEventListener('click', () => {
 isPlaying ? pauseSong() : playSong();
 });
 
 prevBtn.addEventListener('click', prevSong);
 nextBtn.addEventListener('click', nextSong);
 
 audio.addEventListener('timeupdate', updateProgressBar);
 audio.addEventListener('ended', nextSong);
 
 progressBar.addEventListener('click', function(e) {
 const percent = e.offsetX / this.offsetWidth;
 audio.currentTime = percent * audio.duration;
 progressBar.value = percent * 100;
 });
 
 volumeBar.addEventListener('input', setVolume);
 
 // Инициализация
 initPlayer();
 
 // Установка продолжительности песни при загрузке метаданных
 audio.addEventListener('loadedmetadata', function() {
 durationEl.textContent = formatTime(audio.duration);
 });
});