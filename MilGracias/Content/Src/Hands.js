const video = document.getElementById('input_camera');
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');

let prevX = null;
let prevY = null;
const threshold = 15;

// Variable para controlar el tiempo del último log
let lastLogTime = 0;
const logInterval = 600; // en milisegundos (0.6 segundos)

//variable de envio de datos a phaser
let handCommand = "";


const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(results => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 &&
        results.multiHandedness && results.multiHandedness.length > 0) {

        const hand = results.multiHandLandmarks[0];
        const handedness = results.multiHandedness[0].label;


        //This is with right hand but the camera is mirrored
        if (handedness === "Left") {
            const indexFingerTip = hand[8];
            const x = indexFingerTip.x * canvas.width;
            const y = indexFingerTip.y * canvas.height;

            if (prevX !== null && prevY !== null) {
                const dx = x - prevX;
                const dy = y - prevY;

                const now = Date.now();
                if (now - lastLogTime > logInterval) {
                    lastLogTime = now;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (dx > threshold) handCommand="L";
                        else if (dx < -threshold) handCommand="R";
                    } else {
                        if (dy > threshold) handCommand="D";
                        else if (dy < -threshold) handCommand="U";
                    }


                }

                    
            }

            prevX = x;
            prevY = y;

            drawConnectors(ctx, hand, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(ctx, hand, { color: '#FF0000', lineWidth: 1 });
        }
    }
});


const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 640,
    height: 480
});

camera.start();