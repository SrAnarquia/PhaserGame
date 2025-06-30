
// WEBSOCKET VARIABLES
let socket;
let stm32Command = ""; // Último comando recibido del STM32
let stm32CommandBuffer = "";
let stm32CommandBufferLeft = "";
let openConnection = false; //Esto ordena cuando abrir la conexion


// INICIAR EL WEBSOCKET UNA VEZ CARGA LA PAGINA Y SE LE DICE QUE CARGE!
var config = {
    type: Phaser.AUTO, // O Phaser.AUTO si quieres que el navegador decida
    width: 800,
    height: 600,
    parent: 'phaser-container',
    physics: {
        default: 'arcade',
        arcade: {
            //

            gravity: { y: 300 },
            debug: false
        }
    },

    scene: {
        preload: preload,
        create: create,
        update: update
    }
};


//VARIABLES GLOBALES 
var score = 0;
var scoreText;
var gameOver = false;
var gameOverShown = false;
var music;
var lifes = 3;
var lifesText;
var winner = false;
var winnerShown = false;
var textStart;
var jumpSound;
var startSound;
var boomSound;
var reload;
var confirmReload;
var firstClick = 0;
var playerCreated;

var game = new Phaser.Game(config);

setTimeout(() => {
    const canvas = document.querySelector('#phaser-container canvas');

    if (canvas) {
        canvas.id = 'phaser-game-canvas';

    }


}, 100)




//for user double jump
var jumpCount = 0;
var jumpPressed = false;

function preload() {
    this.load.image('sky', '/Content/assets/sky.png'); // Ajusta esta ruta si es necesario
    this.load.image('ground', '/Content/assets/platform.png');
    this.load.image('star', '/Content/assets/star.png');
    this.load.image('bomb', '/Content/assets/bomb.png');
    this.load.spritesheet('dude', '/Content/assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    this.load.image('heart', '/Content/assets/heart.png');
    this.load.audio('bgMusic', '/Content/Music/mainTheme.mp3');
    this.load.audio('jumpSound', '/Content/Music/jump.wav');
    this.load.audio('starSound', '/Content/Music/star.wav');
    this.load.audio('boomSound', '/Content/Music/boom.wav');
    this.load.image('reload', '/Content/assets/reload.png');
    //DOGGY SPRITE
    this.load.spritesheet('doggy', '/Content/assets/Doggy.png', { frameWidth: 32, frameHeight: 48 });

    //SUN SPRITE
    this.load.spritesheet('sunny', '/Content/assets/sun.png',{frameWidth:128,frameHeight:93});

    //HOUSE SPRITE
    this.load.spritesheet('house', '/Content/assets/house.png', {frameWidth:64,frameHeight:64});
}

function create() {



    //CREACION DE LAS PLATAFORMAS
    this.add.image(400, 300, 'sky');
    platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');


    //CREACION DE LAS VIDAS
    this.add.image(612, 32, 'heart').setScale(0.0625);

    //CREACION DEL BOTON RELOAD - SE COLOCA AL CENTRO
    reload = this.add.image(400, 32, 'reload').setScale(0.0625).setInteractive();


    //EFECTO DE PARPADEO CON TWEENS
    this.tweens.add({
        targets: reload,
        alpha: 0,
        duration: 1400,
        yoyo: true,
        repeat: -1

    });


    //SE OCULTA BOTON DE RELOAD INICIALMENTE
    reload.setAlpha(0); // semitransparente hasta que se habilite



    //CREACION DEL TEXTO DE INICIO 
    textStart = createStartText(this);


    //CREACION DE SONIDO DE LOS SALTOS
    jumpSound = this.sound.add('jumpSound', {
        volume: 0.33
    });


    //CREACION DE SONIDO DE LAS ESTRELLAS
    startSound = this.sound.add('starSound', {
        volume: 0.33
    });


    //CREACION DE SONIDOS DE LAS BOMBAS
    boomSound = this.sound.add('boomSound', {
        volume: 0.5

    });




    //CREACION DE LA MUSICA
    music = this.sound.add('bgMusic', {
        loop: true,
        volume: 0.3
    });

    //MUSICA SUENA LUEGO DE UN CLICK POR POLITICA DE SEGURIDAD DEL NAVEGADOR
    this.input.once('pointerdown', () => {
        this.sound.mute = false;
        music.play();
        //SE DESTRUYE EL TEXTO
        textStart.destroy();
        //SE REANUDA EL JUEGO
        this.physics.resume();

        //SE QUITA LA PAUSA EN TWEENS
        this.tweens.resumeAll();

        //ABRE LA CONEXION WEBSOCKET
        webSocketOpen(true);

        reload.setAlpha(1);

        //CREAMOS AL PERRITO
        createDog(this);

        //CREAMOS AL SOLECTIO
        createSun(this);


        //CREAMOS LA CASA
        createHouse(this);

        
        //TEXTO DEL PERSONAJE
        textOnPlayers(this, player);

        //SE QUITA EL ALPHA 0 DEL PLAYER
        player.setAlpha(1);

    });




    //SE AGREGA LOGICA PARA MANEJAR CUANDO EL OBJETO ES TOCADO Y EL JUEGO YA ESTA INICIADO
    reload.on('pointerdown', () => {

        if (firstClick > 0) {

            confirmReload = confirm('Are you sure you want to restart the game?');
            if (confirmReload) {
                this.scene.restart(); //  reinicia toda la escena limpia


                //  REINICIAMOS TODAS LAS VARIABLES GLOBALES QUE BLOQUEAN EL JUEGO
                gameOver = false;
                gameOverShown = false;
                winner = false;
                winnerShown = false;
                stm32Command = "";
                stm32CommandBuffer = "";
                stm32CommandBufferLeft = "";
                lifes = 3;
                score = 0;

                //REINICIAMOS VARIABLES DE MODELO
                handCommand = "";
                this.scene.restart();

            }

            

           
            
        }


    });

    //VARIABLES DE CENTRADO DE PERSONAJE
    let centerPlayerY = (this.scale.height / 2) + 212;

    
    //CREACION DEL PERSONAJE
    player = this.physics.add.sprite(100, centerPlayerY, 'dude');

    //SE ESTABLECEN COLISIONES PARA EVITAR QUE EL DUDE SALGA DEL AREA
    player.setCollideWorldBounds(true);

    //SE CREA DINAMICAS DE CAIDA DUDE
    player.setBounce(0.2);

    //SE CREAN ANIMACIONES DEL JUGADOR IZQ, DERECHA, ARRIBA Y ABAJO
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{ key: 'dude', frame: 4 }],
        frameRate: 20

    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1

    });

    //VELOCIDAD DE CAIDA DEL PERSONAJE
    player.body.setGravityY(300);

    //COLISION ENTRE OBJETOS
    this.physics.add.collider(player, platforms);

    //CONTROL DEL JUGADOR
    cursors = this.input.keyboard.createCursorKeys();

    //PROFUNDIDAD DEL PERSONAJE
    player.setDepth(2);

    //SE ESCONDE AL PERSONAJE
    player.setAlpha(0);


    //ESTRELLAS ANIMACIONES
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });


    stars.children.iterate(function (child) {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));


    });

    //SE AGREGA PROFUNDIDAD DE LAS ESTRELLAS
    stars.setDepth(2);


    this.physics.add.collider(stars, platforms);

    //CODIGO DE LAS ESTRELLAS OVERLAP PARA DETECTAR FISICAS SIN REBOTE DENTRO DE ESCENA
    this.physics.add.overlap(player, stars, collecStar, null, this);


    //CODIGO PARA LAS PUNTUACIONES
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });


    //CREATING BOMBS
    bombs = this.physics.add.group();

    bombs.setDepth(3);

    this.physics.add.collider(bombs, platforms);

    this.physics.add.collider(player, bombs, hitBomb, null, this);


    //CODIGO PARA LAS VIDAS:
    lifesText = this.add.text(632, 16, 'Lifes: 3', { fontSize: '32px', fill: '#000' });




}

function update() {


    //SE PREGUNTA SI USUARIO YA GANO
    if (winner) {
        if (!winnerShown) {
            //MENSAJE POR PANTALLA DE GANADOR:

            this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                'YOU WIN',
                {
                    fontFamily: 'Caveman',
                    fontSize: '64px',
                    color: '#FFD700',
                    stroke: '#5A3A0B',
                    strokeThickness: 6,
                    shadow: {
                        offsetX: 4,
                        offsetY: 4,
                        color: '#000',
                        blur: 4,
                        stroke: true,
                        fill: true
                    }
                }
            ).setOrigin(0.5);

            winnerShown = true;


        }
        return;


    }
    //DE LO CONTRARIO SE PREGUNTA SI YA PERDIO
    else if (gameOver) {
        if (!gameOverShown) {
            this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                'GAME OVER',
                {
                    fontFamily: 'Caveman',
                    fontSize: '64px',
                    color: '#8B4513',
                    stroke: '#000',
                    strokeThickness: 6
                }
            ).setOrigin(0.5);

            gameOverShown = true;
        }

        return;
    }



    //CONTROLES DE TECLADO || stm32Command CONTROLES DEL MICROCONTRLADOR || MODELO CONTROLES

    // Mover a la izquierda

    if (stm32Command!="")
    {
        if (cursors.left.isDown || stm32Command == "4" || stm32Command == "6") {

            //LIMPIAMOS BUFFER PARA EVITAR BRINCAR A DERECHA
            stm32CommandBuffer = "";

            player.setVelocityX(-160);
            player.anims.play('left', true);

            handCommand == "";
        }
        // Mover a la derecha
        else if (cursors.right.isDown || stm32Command == "3" || stm32Command == "5" || stm32CommandBuffer == "5") {

            //GUARDANDO DATOS EN BUFFER PARA PERSISNTECIA EN SALTO
            stm32CommandBuffer = "5";

            player.setVelocityX(160);
            player.anims.play('right', true);

            handCommand == "";
        }


    


    }
     


    else {
        player.setVelocityX(0);

        //ANIMACION PARA DEJAR PARADO EL JUGADOR
        player.anims.play('turn', true);

        
        
    }

    //CUANDO EL JUGADOR TOCA SUELO SE REINICIA EL JUMPCOUNT
    if (player.body.touching.down) {
        jumpCount = 0;

     
    }


    //ANIMACIONES DE SALTO
    if ((cursors.up.isDown || cursors.space.isDown || handCommand=="U") && jumpCount < 2 && !jumpPressed) {

        console.log(handCommand);
        player.setVelocityY(-330);
        jumpCount++;
        jumpPressed = true;
        //REPRODUCIMOS EL SONIDO CREADO
        jumpSound.play();

        //SIN ESTO LUEGO INTERFIERE EL STM32 CON LO SALTOS DE TECLADO PC
        stm32Command = "2";
        //SE REINICIA EL COMANDO PARA QUE NO SE TRABE
        handCommand = "";

        
    }
    if (stm32Command=="1" && jumpCount < 2 && !jumpPressed) {


        player.setVelocityY(-330);
        jumpCount++;
        jumpPressed = true;
        //REPRODUCIMOS EL SONIDO CREADO
        jumpSound.play();

        handCommand == "";


    }
    

    //ESTO EVITA MAS DE 2 SALTOS
    if (!cursors.up.isDown && !cursors.space.isDown && stm32Command=="2" ) {
        jumpPressed = false;

       

        
       
      
    }
    


    

}


function collecStar(player, star) {
    star.disableBody(true, true);


    //SAVING OLD SCORE
    starLast = score;
    score += 10;
    scoreText.setText('Score: ' + score);


    //MAKE THE SOUND PLAY
    startSound.play();



    //DETECTA EL PUNTUAJE 650 o 150
    if (score == 130) {
        //LA ANIMACION ES PAUSADA
        this.physics.pause();
        //CAMBIA LA ANIMACION DEL PERSONAJE AL MORIR
        player.anims.play('turn');

        winner = true;

        //MUSICA DEJA DE SONAR AL GANAR EL JUEGO 
        music.stop();


        //SE DETIENE ANIMACION DE LA CASA
        house.anims.stop();

        //SE DETIENE LA ANIMACION DEL SOL
        sunny.anims.stop();

        //SE DETIENE LA ANIMACION DEL DOGGY

        doggy.anims.stop();

    }

    //Detectar la ultima estrella y cuantas quedan restantes

    else if (stars.countActive(true) == 0) {
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true)

        });



        var x = (player.x < 400) ? Phaser.Math.Between(400, 400) : Phaser.Math.Between(0, 400);


        //SE CREEA LA BOMBA A LANZAR
        var bomb = bombs.create(x, 16, 'bomb');

        bomb.setBounce(1);


        bomb.setCollideWorldBounds(true);



        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }



}

//PERSONAJE EN ROJO AL SER GOLPEADO
function hitBomb(player, bomb) {

    //REMOVING SCORE AS PENALTY
    score = score - 60;
    scoreText.setText('Score: ' + score);

    //AFTER TOUCHING THE BOMB THIS WILL REMOVED
    bomb.disableBody(true, true);


    //CAMBIA A COLOR ROJO AL PERSONAJE
    player.setTint(0xff0000);


    //VIDAS SE REDUCE EN 1
    lifes--;

    lifesText.setText('Lifes: ' + lifes);

    //SONIDO DE GOLPE DE BOMBA SUENA
    boomSound.play();


    if (lifes == 0) {
        //LA ANIMACION ES PAUSADA
        this.physics.pause();
        //CAMBIA LA ANIMACION DEL PERSONAJE AL MORIR
        player.anims.play('turn');

        gameOver = true;

        //MUSICA DEJA DE SONAR AL SER GOLPEADO POR BOMBA Y MORIRd
        music.stop();

        //SE DETIENE AL PERRITO
        doggy.anims.stop();

        //SE ESCONDE EL SOL PARA MOSTRAR RESET
        sunny.setAlpha(0);

        //SE DETIENE LA CASA
        house.anims.stop();

    }
    else {
        //PAUSAMOS UN POCO ANTES DE CAMBIE EL TINTE DEL PERSONAKE
        this.time.delayedCall(380, () => {
            player.clearTint();
        });

    }




}

//ESTA FUNCION INICIA EL JUEGO Y EN FUTURA EXPANCIONES SE INTEGRA CON PAUSE Y RESUME BOTONES
function createStartText(scene) {
    //ESTO DETIENE LA ANIMACION
    scene.physics.pause();
    scene.sound.mute = true;
    //DETIENE LAS ANIMACIONES TWEENS
    scene.tweens.pauseAll();

    text = scene.add.text(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY,
        'CLICK TO START',
        {
            fontFamily: 'Caveman',
            fontSize: '64px',
            color: '#33ffcc',               // Verde azulado fosforescente (retro arcade)
            backgroundColor: '#1a1a1a',     // Gris oscuro, da contraste sin ser totalmente negro
            padding: { x: 24, y: 12 },
            stroke: '#00bfa6',              // Contorno turquesa brillante
            strokeThickness: 5,
            shadow: {
                offsetX: 4,
                offsetY: 4,
                color: '#000000',
                blur: 4,
                stroke: true,
                fill: true
            }
        }

    ).setOrigin(0.5).setInteractive();




    return text;


}



function webSocketOpen(openConnection)
{
    if (!openConnection) return;
    
    socket = new WebSocket("ws://localhost:3000/");

    socket.onopen = () => {
        console.log("🟢 Connected to the WebSocket");
    };

    socket.onmessage = (event) => {
        stm32Command = event.data.trim().toLowerCase();
        console.log("📥 STM32 says:", stm32Command);
    };

    socket.onerror = (err) => {
        console.error("❌ WebSocket error", err);
    };

    socket.onclose = () => {
        console.log("🔴 WebSocket closed");
    };
    
    //SE CARGA EL PRIMER CLICK

    firstClick++;
   // console.log(firstClick);
   

}


//ESTO CREA UN PERSONJE




//ESTO CREA UN SOL
function createDog(scene)
{
    //PROPIEDADES PARA CENTRAR AL LA CASA
    let centerX = (scene.scale.width / 2) - 310;
    let centerY = (scene.scale.height / 2) + 205;

    // INSTANCIANDO AL PERRITO
    doggy = scene.physics.add.sprite(centerX, centerY, 'doggy');

    //SE ESTABLECE LA PROFUNDIDAD DEL DOGGY =PLAYER
    doggy.setDepth(0);

    // SE ESTABLECEN COLISIONES PARA EVITAR QUE EL DOGGY SALGA DEL ÁREA
    doggy.setCollideWorldBounds(true);
    doggy.setBounce(0.2);
    doggy.setImmovable(false); // Asegúrate que pueda moverse




    // COLISIÓN ENTRE DOGGY Y PLATAFORMAS
    scene.physics.add.collider(doggy, platforms);

    // CREACIÓN DE ANIMACIÓN PARA DOGGY (frames del 0 al 3)
    scene.anims.create({
        key: 'run_right',
        frames: scene.anims.generateFrameNumbers('doggy', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // VARIABLE DE DIRECCIÓN DEL PERRITO
    let doggyDirection = 'right';


    //VARIABLES DE CONTROL DE ANIMACION
    let insideHome = 0;
    let pauseTriggered = false;

    
    // SE ESTABLECE VELOCIDAD INICIAL Y ANIMACIÓN
    doggy.setVelocityX(50);
    doggy.anims.play('run_right', true);

    // TIMER PARA MOVER AUTOMÁTICAMENTE DE DERECHA A IZQUIERDA Y VICEVERSA
   scene.time.addEvent({
        delay: 100, // ms
        loop: true,
        callback: () => {
            if (doggy.x >= 740 && doggyDirection === 'right') {
                doggy.setVelocityX(-50);
                doggy.setFlipX(true); // Si no tienes animación izquierda, solo voltea
                doggyDirection = 'left';
                insideHome++;
            }
            else if (doggy.x <= 60 && doggyDirection === 'left') {
                doggy.setVelocityX(50);
                doggy.setFlipX(false);
                doggyDirection = 'right';
                insideHome++;
            }
            else if (insideHome == 2 && !pauseTriggered) //PARA CUANDO EL DOGGY YA SALIO 2 VECES DE CASA
            {
                //TRIGGER DE PAUSA
                pauseTriggered = true;

                //DETENEMOS LA ANIMACION DURANTE UNOS SEGUNDOS
                doggy.setVelocityX(0);
                doggy.anims.stop();

                //PAUSAMOS UN POCO ANTES DE QUE VUELVA A SALIR EL DOGGY
                // Detenemos el movimiento y animación después de 2 segundos
                scene.time.delayedCall(6000, () => {

                    //RESET DEL TRIGGER
                    pauseTriggered = false;

                    //RESET DEL CONTADOR
                    insideHome = 0;
                    //MUEVE A DERECHA LUEGO DE LOS 3 SEGUNDOS
                    doggy.setVelocity(50);
                    doggy.anims.play('run_right', true);
                    doggy.setFlipX(false); // Si no tienes animación izquierda, solo voltea
                    doggyDirection = 'right';

                });
            }
        }
    });

    return doggy;
}


//ESTO CREA UN SOL
function createSun(scene)
{
    //PROPIEDADES PARA CENTRAR AL SOL
    let centerX = (scene.scale.width / 2);
    let centerY = (scene.scale.height / 2)-255;

    //INSTANCIAMOS AL SOLECITO
    sunny = scene.physics.add.sprite(centerX, centerY);

    //SE AGREGA PROFUNDIDAD
    sunny.setDepth(0);

    //SE QUITA GHAVEDAD Y ASI MISMO SE DEJA ORIGEN EN MITAD DEL CANVA
    sunny.setOrigin(0.5, 0.5); // Centra el sprite desde su centro

    // Desactiva la gravedad y el movimiento
    sunny.body.setAllowGravity(false);
    sunny.body.setImmovable(true);
    sunny.body.moves = false;

    


    // CREACION DE ANIMACION DE SOLECITO
    scene.anims.create({
        key: 'shine',
        frames: scene.anims.generateFrameNumbers('sunny', { start: 0, end: 15 }),
        frameRate: 10,
        repeat:-1
      
    });



    sunny.anims.play('shine',true);


    return sunny;

}


//ESO CREA UNA CASA
function createHouse(scene)
{
    //PROPIEDADES PARA CENTRAR AL LA CASA
    let centerX = (scene.scale.width / 2)-328;
    let centerY = (scene.scale.height / 2) +205;

    //INSTANCIAMOS A LA CASA
    house = scene.physics.add.sprite(centerX, centerY);

    //SE AGREGA PROFUNDIDAD
    house.setDepth(0);

    //SE QUITA GHAVEDAD Y ASI MISMO SE DEJA ORIGEN EN MITAD DEL CANVA
    house.setOrigin(0.5, 0.5); // Centra el sprite desde su centro

    // SE DESACTIVA EL MOVIMIENTO Y SE DESACTIVA LA GRAVEDAD
    house.body.setAllowGravity(false);
    house.body.setImmovable(true);
    house.body.moves = false;




    // CREACION DE ANIMACION DE SOLECITO
    scene.anims.create({
        key: 'house',
        frames: scene.anims.generateFrameNumbers('house', { start: 0, end: 4 }),
        frameRate: 10,
        repeat: -1

    });



    house.anims.play('house', true);


    return house;
}


function textOnPlayers(scene, player) {
    // Creamos el textbox del personaje
    const speechBubble = scene.add.text(player.x, player.y - 40, "Let's Go!", {
        fontSize: '32px',
        fontStyle: 'bold',
        fill: '#FFD700', // color dorado/amarillo
        fontFamily: 'Caveman',
        backgroundColor: '#502F7C', // fondo morado oscuro
        padding: { x: 14, y: 8 },
        stroke: '#FFFFFF',       // borde blanco
        strokeThickness: 4,      // grosor del borde
    }).setOrigin(0.5);

    // Agregar sombra al texto
    speechBubble.setShadow(2, 2, '#000', 4, true, true);



    // Desaparece la viñeta después de 800 ms
    scene.time.delayedCall(800, () => {
        speechBubble.destroy();
    });

    return speechBubble;
}