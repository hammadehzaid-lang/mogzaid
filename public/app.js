(function(){
  // Set window.MOG_API_URL in config.js when the frontend is hosted separately.
  const apiBase = (window.MOG_API_URL || '').replace(/\/$/, '');
  const isLocalServer = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  const scoreBtn = document.getElementById('scoreBtn');
  const leaderboardEl = document.getElementById('leaderboard');
  const nameInput = document.getElementById('nameInput');
  const saveNameBtn = document.getElementById('saveNameBtn');

  let detector = null;
  if ('FaceDetector' in window) {
    detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
  } else {
    document.getElementById('warning').textContent = 'FaceDetector API not supported in this browser. Use Chrome or add a polyfill.';
  }

  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    video.play();
    requestAnimationFrame(detect);
  }).catch(err => {
    document.getElementById('warning').textContent = 'Camera access denied or unavailable.';
  });

  // Initialize name input from localStorage
  try{
    const stored = localStorage.getItem('mogName') || '';
    if (stored && nameInput) nameInput.value = stored;
  }catch(e){}

  if (saveNameBtn) saveNameBtn.addEventListener('click', ()=>{
    const n = (nameInput && nameInput.value.trim()) || 'Guest';
    try{ localStorage.setItem('mogName', n); }catch(e){}
    alert('Name saved: ' + n);
  });

  function detect(){
    if (video.videoWidth === 0) { requestAnimationFrame(detect); return; }
    // match canvas to video intrinsic size (pixel coordinates)
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.style.width = video.clientWidth + 'px'; canvas.style.height = video.clientHeight + 'px';
    // size the frame to intrinsic pixels so transforms map correctly
    const frame = document.getElementById('frame');
    if (frame) { frame.style.width = canvas.width + 'px'; frame.style.height = canvas.height + 'px'; }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (detector) {
      detector.detect(video).then(faces => {
        if (faces && faces.length) {
          const f = faces[0].boundingBox;
          ctx.strokeStyle = 'lime'; ctx.lineWidth = 3; ctx.strokeRect(f.x, f.y, f.width, f.height);
          // Draw center point
          ctx.fillStyle = 'rgba(0,255,0,0.8)';
          ctx.beginPath(); ctx.arc(f.x + f.width/2, f.y + f.height/2, 4, 0, Math.PI*2); ctx.fill();

          // Compute zoom scale and translate to center the face in the viewport by transforming the whole frame
          const vw = canvas.width; const vh = canvas.height;
          // choose target fraction of viewport the face should fill (e.g., 0.6)
          const targetFraction = 0.6;
          const scale = Math.min(3, Math.max(1, (targetFraction * vw) / f.width));
          const cx = f.x + f.width/2; const cy = f.y + f.height/2;
          const tx = (vw/2) - (cx * scale);
          const ty = (vh/2) - (cy * scale);
          if (frame) {
            frame.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
          }
          // show scanning indicator while tracking
          const yourScoreEl = document.getElementById('yourScore');
          if (yourScoreEl) yourScoreEl.textContent = 'Tracking face';
        } else {
          // reset transform
          if (frame) frame.style.transform = '';
          const yourScoreEl = document.getElementById('yourScore');
          if (yourScoreEl) yourScoreEl.textContent = 'No face detected';
        }
      }).catch(()=>{});
    }
    requestAnimationFrame(detect);
  }

  scoreBtn.addEventListener('click', async ()=>{
    if (!video.videoWidth || !video.videoHeight) {
      document.getElementById('warning').textContent = 'Camera is not ready yet.';
      return;
    }
    const score = Math.floor(Math.random()*80 + 10); // simple placeholder for 'mog rate'
    const yourScoreEl = document.getElementById('yourScore');
    if (yourScoreEl) yourScoreEl.textContent = 'Score: ' + score;
    const snap = document.createElement('canvas'); snap.width = video.videoWidth; snap.height = video.videoHeight;
    const sctx = snap.getContext('2d'); sctx.drawImage(video,0,0);
    snap.toBlob(async blob => {
      try {
        if (!blob) throw new Error('Snapshot could not be created');
        const form = new FormData();
        form.append('image', blob, 'self.jpg');
        const chosenName = (nameInput && nameInput.value.trim()) || localStorage.getItem('mogName') || 'Guest';
        form.append('name', chosenName);
        form.append('score', score);
        const uploadUrl = apiBase ? apiBase + '/upload' : (isLocalServer ? '/upload' : null);
        if (!uploadUrl) throw new Error('No API URL configured');
        const response = await fetch(uploadUrl, { method: 'POST', body: form });
        if (!response.ok) throw new Error('Upload service unavailable');
        loadLeaderboard();
      } catch (error) {
        document.getElementById('warning').textContent = 'Score: ' + score + '. The public leaderboard API is not configured yet.';
      }
    }, 'image/jpeg', 0.9);
  });

  async function loadLeaderboard(){
    try{
      const leaderboardUrl = apiBase ? apiBase + '/leaderboard' : (isLocalServer ? '/leaderboard' : 'leaderboard.json');
      const res = await fetch(leaderboardUrl);
      if (!res.ok) throw new Error('Leaderboard request failed: ' + res.status);
      const data = await res.json();
      leaderboardEl.innerHTML = '';
      data.forEach(entry => {
        const item = document.createElement('div'); item.className = 'leaderboard-item';
        const img = document.createElement('img');
        img.src = entry.image && entry.image.startsWith('/') && apiBase ? apiBase + entry.image : entry.image;
        const info = document.createElement('div'); info.className = 'lb-info';
        const h4 = document.createElement('h4'); h4.textContent = entry.name || 'Guest';
        const p = document.createElement('p'); p.textContent = 'Score: ' + (entry.score || 0);
        info.appendChild(h4); info.appendChild(p);
        item.appendChild(img); item.appendChild(info);
        leaderboardEl.appendChild(item);
      });
    }catch(e){
      console.warn(e);
      leaderboardEl.innerHTML = '<p>Leaderboard unavailable. Start the Node server or configure the public API.</p>';
    }
  }

  loadLeaderboard();
  setInterval(loadLeaderboard, 5000);

})();
