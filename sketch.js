// --- 전역 변수 설정 ---
let cam;              // 웹캠 객체
let targetColor;      // 추적할 색상 (빨간색)
let threshold = 170;    // 색상 유사도 임계값

// ⭐ 성능 최적화: 격자 크기를 크게 늘림 (20 -> 60)
let checkCellSize = 60; // 색상 검출 격자 크기 
// ⭐ 성능 최적화: 텍스트 출력 간격을 늘림 (10 -> 20)
let textStep = 20;        // 텍스트 출력 간격
let mosaicText = "*";   // 모자이크에 사용할 텍스트

// --- 잔상 효과를 위한 변수 ---
let presenceBuffer; // 각 격자의 "생명력"을 저장하는 2차원 배열
let numCols;        // 격자 열 수
let numRows;        // 격자 행 수

let maxPresence = 255.0; 
let growRate = 60.0;    
let fadeRate = 40.0;    

// ⭐ 성능 최적화: 해상도를 320x240으로 낮춤 (4:3 비율 유지)
const CAM_WIDTH = 320; 
const CAM_HEIGHT = 240; 

// ----------------------------------------------------
// 1. 초기 설정 (setup)
// ----------------------------------------------------
function setup() {
  // 캔버스를 고정된 크기 (320x240)로 생성
  createCanvas(CAM_WIDTH, CAM_HEIGHT); 
  // ⭐ 성능 최적화: 프레임 속도를 15에서 10으로 낮춤
  frameRate(10); 

  targetColor = color(255, 0, 0); 
  
  // 격자 크기 계산
  numCols = ceil(width / checkCellSize);
  numRows = ceil(height / checkCellSize);
  
  // 잔상 버퍼 초기화
  presenceBuffer = new Array(numCols);
  for (let i = 0; i < numCols; i++) {
    presenceBuffer[i] = new Array(numRows).fill(0);
  }

  // 웹캠 설정 (해상도 명시적 요청)
  cam = createCapture({
    video: {
      width: { exact: CAM_WIDTH }, 
      height: { exact: CAM_HEIGHT }
    }, 
    audio: false 
  });
  
  cam.size(CAM_WIDTH, CAM_HEIGHT);
  cam.hide(); 
  
  textAlign(CENTER, CENTER);
  textSize(25);
}

// ----------------------------------------------------
// 2. 그리기 루프 (draw)
// ----------------------------------------------------
function draw() {
  
  background(0); 

  if (cam && cam.loadedmetadata) {
    cam.loadPixels();
    
    // --------------------------------------------------
    // Phase 1: 잔상 버퍼 업데이트 (감쇠)
    // --------------------------------------------------
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numRows; j++) {
        presenceBuffer[i][j] -= fadeRate; 
        presenceBuffer[i][j] = max(0, presenceBuffer[i][j]); 
      }
    }

    // --------------------------------------------------
    // Phase 2: 색상 검출 및 생명력 증가
    // --------------------------------------------------
    for (let x = 0; x < width; x += checkCellSize) {
      for (let y = 0; y < height; y += checkCellSize) {
        
        let i = floor(x / checkCellSize); 
        let j = floor(y / checkCellSize); 
        
        let pixelColor = cam.get(x + checkCellSize/2, y + checkCellSize/2);
        
        let d = dist(red(pixelColor), green(pixelColor), blue(pixelColor), 
                     red(targetColor), green(targetColor), blue(targetColor));
        
        if (d < threshold) {
          presenceBuffer[i][j] += growRate;
          presenceBuffer[i][j] = min(maxPresence, presenceBuffer[i][j]);
        }
      }
    }

    // --------------------------------------------------
    // 2. 웹캠 이미지 출력 (흑백 필터와 좌우 반전 적용)
    // --------------------------------------------------
    
    push();
    translate(width, 0);
    scale(-1, 1);
    
    image(cam, 0, 0, width, height); 
    // filter(GRAY); // ⭐ 성능 최적화를 위해 이 부분을 제거하고 컬러로 출력하거나,
                     // 필요 시 다시 활성화할 수 있습니다. (현재는 활성 유지)
    filter(GRAY); 
              
    pop();

    // --------------------------------------------------
    // Phase 3: 잔상 버퍼 값에 비례하여 텍스트 그리기
    // --------------------------------------------------
    noStroke();
    
    for (let x = 0; x < width; x += textStep) {
      for (let y = 0; y < height; y += textStep) {
        
        let i = floor(x / checkCellSize);
        let j = floor(y / checkCellSize);

        if (i >= numCols || j >= numRows) continue;

        let currentPresence = presenceBuffer[i][j];
        
        if (currentPresence > 0) {
          
          fill(255, 0, 0, currentPresence);
          
          let drawX = width - x; 
          let drawY = y;
          
          let jitterX = random(-textStep * 0.5, textStep * 0.5);
          let jitterY = random(-textStep * 0.5, textStep * 0.5);

          text(mosaicText, drawX + jitterX, drawY + jitterY);
        }
      }
    }
  } else {
      if (cam) {
          fill(255, 255, 0); 
          text("웹캠 로드 중...", width / 2, height / 2);
      } else {
          fill(255, 0, 0); 
          text("오류: 웹캠 객체 생성 실패 - 콘솔 확인 필요", width / 2, height / 2);
      }
  }
}
