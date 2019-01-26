const localVideo = document.getElementById('local_video');
const remoteVideo = document.getElementById('remote_video');
const textForSendSdp = document.getElementById('text_for_send_sdp');
const textToReceiveSdp = document.getElementById('text_for_receive_sdp');
let localStream = null;
let peerConnection = null;
//let negotiationneededCounter = 0;
//let isOffer = false;

// --- for Screen
let localScreenStream = null;
const localScreenVideo = document.getElementById('local_screen_video');
const remoteScreenVideo = document.getElementById('remote_screen_video');
let screenSender = null;
//let negotiationneededCountdown = 0;
let sendingOffer = false;

// シグナリングサーバへ接続する
const wsUrl = 'ws://localhost:3001/';
const ws = new WebSocket(wsUrl);
ws.onopen = (evt) => {
    console.log('ws open()');
};
ws.onerror = (err) => {
    console.error('ws onerror() ERR:', err);
};
ws.onmessage = (evt) => {
    console.log('ws onmessage() data:', evt.data);
    const message = JSON.parse(evt.data);
    switch(message.type){
        case 'offer': {
            console.log('Received offer ...');
            textToReceiveSdp.value = message.sdp;
            setOffer(message);
            break;
        }
        case 'answer': {
            console.log('Received answer ...');
            textToReceiveSdp.value = message.sdp;
            setAnswer(message);
            break;
        }
        case 'candidate': {
            console.log('Received ICE candidate ...');
            const candidate = new RTCIceCandidate(message.ice);
            console.log(candidate);
            addIceCandidate(candidate);
            break;
        }
        case 'close': {
            console.log('peer is closed ...');
            hangUp();
            break;
        }      
        default: { 
            console.log("Invalid message"); 
            break;              
         }         
    }
};

// ICE candaidate受信時にセットする
function addIceCandidate(candidate) {
    if (peerConnection) {
        peerConnection.addIceCandidate(candidate);
    }
    else {
        console.error('PeerConnection not exist!');
        return;
    }
}

// ICE candidate生成時に送信する
function sendIceCandidate(candidate) {
    console.log('---sending ICE candidate ---');
    const message = JSON.stringify({ type: 'candidate', ice: candidate });
    console.log('sending candidate=' + message);
    ws.send(message);
}

// getUserMediaでカメラ、マイクにアクセス
async function startVideo() {
    try{
        localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        playVideo(localVideo,localStream);
    } catch(err){
        console.error('mediaDevice.getUserMedia() error:', err);
    }
}

// Videoの再生を開始する
async function playVideo(element, stream) {
    if (element.srcObject === stream) {
      console.warn('same stream. skip playVideo ');
      return;
    }

    element.srcObject = stream;
    try{
        await element.play();
    }
    catch(err) {
        console.error(err)
    };
}

// WebRTCを利用する準備をする
function prepareNewConnection(isOffer) {
    const pc_config = {"iceServers":[ {"urls":"stun:stun.webrtc.ecl.ntt.com:3478"} ], "sdpSemantics" : "unified-plan"};
    const peer = new RTCPeerConnection(pc_config);

    // リモートのMediStreamTrackを受信した時
    peer.ontrack = evt => {
        console.log('-- peer.ontrack()');
        let stream = evt.streams[0];
        //if (! isVideoUsed(remoteVideo)) {
        if (isVideoAvailable(remoteVideo, stream)) {
            playVideo(remoteVideo, stream);
        }
        else {
            playVideo(remoteScreenVideo, stream);
            stream.onremovetrack = (evt) => {
                cleanupVideoElement(remoteScreenVideo);
            }
        }
    };

    // ICE Candidateを収集したときのイベント
    peer.onicecandidate = evt => {
        if (evt.candidate) {
            console.log(evt.candidate);
            sendIceCandidate(evt.candidate);            
        } else {
            console.log('empty ice event');
            // sendSdp(peer.localDescription);
        }
    };

    // Offer側でネゴシエーションが必要になったときの処理
    peer.onnegotiationneeded = async () => {
        console.log('peer.onnegotiationneeded()');
        try {
            /*
            if(isOffer){
                if(negotiationneededCounter === 0){
                    let offer = await peer.createOffer();
                    console.log('createOffer() succsess in promise');
                    await peer.setLocalDescription(offer);
                    console.log('setLocalDescription() succsess in promise');
                    sendSdp(peer.localDescription);
                    negotiationneededCounter++;
                }
                else {
                  console.warn('skip onnegotiationneeded(), more than once');
                }
            }
            else {
              console.warn('skip onnegotiationneeded(), not offer side');
            }
            */

            /*
            if (negotiationneededCountdown === 0) {
                console.warn('skip onnegotiationneeded(), not sending offer');
                return;
            }
            negotiationneededCountdown--;
            if (negotiationneededCountdown > 0) {
                console.warn('skip onnegotiationneeded(), waiting for all tracks');
                return;
            }
            */

            if (! sendingOffer) {
              console.warn('skip onnegotiationneeded(), not sending offer');
              return;              
            }

            sendingOffer = false;
            let offer = await peer.createOffer();
            console.log('createOffer() succsess in promise');
            await peer.setLocalDescription(offer);
            console.log('setLocalDescription() succsess in promise');
            sendSdp(peer.localDescription);
        } catch(err){
            console.error('setLocalDescription(offer) ERROR: ', err);
        }
    }

    // ICEのステータスが変更になったときの処理
    peer.oniceconnectionstatechange = function() {
        console.log('ICE connection Status has changed to ' + peer.iceConnectionState);
        switch (peer.iceConnectionState) {
            case 'closed':
            case 'failed':
                if (peerConnection) {
                    hangUp();
                }
                break;
            case 'dissconnected':
                break;
        }
    };

    // ローカルのMediaStreamを利用できるようにする
    if (localStream) {
        console.log('Adding local stream...');
        localStream.getTracks().forEach(track => {
            peer.addTrack(track, localStream);
            if (isOffer) {
              sendingOffer = true;
              //negotiationneededCountdown++;
            }
        });
    } else {
        console.warn('no local stream, but continue.');
    }

    return peer;
}

// 手動シグナリングのための処理を追加する
function sendSdp(sessionDescription) {
    console.log('---sending sdp ---');
    textForSendSdp.value = sessionDescription.sdp;
    /*---
     textForSendSdp.focus();
     textForSendSdp.select();
     ----*/
     const message = JSON.stringify(sessionDescription);
     //console.log('sending SDP=' + message);
     console.log('sending SDP type=' + sessionDescription.type);
     ws.send(message);
}

// Connectボタンが押されたらWebRTCのOffer処理を開始
function connect() {
    if (! peerConnection) {
        console.log('make Offer');
        peerConnection = prepareNewConnection(true);
    }
    else {
        console.warn('peer already exist.');
    }
}

// Answer SDPを生成する
async function makeAnswer() {
    console.log('sending Answer. Creating remote session description...' );
    if (! peerConnection) {
        console.error('peerConnection NOT exist!');
        return;
    }
    try{
        let answer = await peerConnection.createAnswer();
        console.log('createAnswer() succsess in promise');
        await peerConnection.setLocalDescription(answer);
        console.log('setLocalDescription() succsess in promise');
        sendSdp(peerConnection.localDescription);
    } catch(err){
        console.error(err);
    }
}

// Receive remote SDPボタンが押されたらOffer側とAnswer側で処理を分岐
function onSdpText() {
    const text = textToReceiveSdp.value;
    if (peerConnection) {
        console.log('Received answer text...');
        const answer = new RTCSessionDescription({
            type : 'answer',
            sdp : text,
        });
        setAnswer(answer);
    }
    else {
        console.log('Received offer text...');
        const offer = new RTCSessionDescription({
            type : 'offer',
            sdp : text,
        });
        setOffer(offer);
    }
    textToReceiveSdp.value ='';
}

// Offer側のSDPをセットする処理
async function setOffer(sessionDescription) {
    if (peerConnection) {
        console.warn('peerConnection alreay exist!');
    }
    else {
      peerConnection = prepareNewConnection(false);
    }
    try{
        await peerConnection.setRemoteDescription(sessionDescription);
        console.log('setRemoteDescription(offer) succsess in promise');
        makeAnswer();
    } catch(err){
        console.error('setRemoteDescription(offer) ERROR: ', err);
    }
}

// Answer側のSDPをセットする場合
async function setAnswer(sessionDescription) {
    if (! peerConnection) {
        console.error('peerConnection NOT exist!');
        return;
    }
    try{
        await peerConnection.setRemoteDescription(sessionDescription);
        console.log('setRemoteDescription(answer) succsess in promise');
    } catch(err){
        console.error('setRemoteDescription(answer) ERROR: ', err);
    }
}

// P2P通信を切断する
function hangUp(){
    if (peerConnection) {
        if(peerConnection.iceConnectionState !== 'closed'){
            peerConnection.close();
            peerConnection = null;
            //negotiationneededCounter = 0;
            const message = JSON.stringify({ type: 'close' });
            console.log('sending close message');
            ws.send(message);
            cleanupVideoElement(remoteVideo);

            cleanupVideoElement(remoteScreenVideo);

            textForSendSdp.value = '';
            textToReceiveSdp.value = '';
            return;
        }
    }
    console.log('peerConnection is closed.');
}

// ビデオエレメントを初期化する
function cleanupVideoElement(element) {
    element.pause();
    element.srcObject = null;
}

// ----------- screen --------
// Chrome Canary 73 ... no-flags, navigator.mediaDevices.getDisplayMedia({video:true})
//   audio not supported
//   Unified plan ... default (72-)
// Chrome stable 71 .. with Experimental Web Platform features flag, navigator.getDisplayMedia({ video: true})
//   audio not supported

async function addScreen() {
  try{
      localScreenStream = await navigator.mediaDevices.getDisplayMedia({video: true});
      //localScreenStream = await navigator.mediaDevices.getDisplayMedia({video: { displaySurface: 'window', cursor: 'motion'}}); // NOT effective


      playVideo(localScreenVideo, localScreenStream);
      console.log('Screen Capture OK');

      //negotiationneededCounter = 0;
      //negotiationneededCountdown = 1;
      sendingOffer = true;
      screenSender = peerConnection.addTrack(localScreenStream.getVideoTracks()[0], localScreenStream);
  } catch(err){
      console.error('mediaDevice.getDisplayMedia() error:', err);
  }
}

function removeScreen() {
    if (screenSender) {
        //negotiationneededCounter = 0;
        //negotiationneededCountdown = 1;
        sendingOffer = true;
        peerConnection.removeTrack(screenSender);
        screenSender = null;
    }
    if (localScreenStream) {
        cleanupVideoElement(localScreenVideo);
        stopStream(localScreenStream);
        localScreenStream = null;
    }
}

function isVideoUsed(element) {
    if (element.srcObject) {
        return true;
    }
    else {
        return false;
    }
}

function isVideoAvailable(element, stream) {
    if (! element.srcObject) {
        return true;
    }
    if (element.srcObject === stream) {
      return true;
    }
    else {
      return false;
    }
}

function stopStream(stream) {
    stream.getTracks().forEach(track => track.stop());
}