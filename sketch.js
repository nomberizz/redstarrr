// --- 전역 변수 설정 ---
let cam;              
let targetColor;      

// 색상 정확도 유지
let threshold = 150;    

// ⭐⭐ 최종 수정: 색상 검출 격자를 80 -> 40으로 줄여 모양 정확도 개선 ⭐⭐
let checkCellSize = 40; 
// 밀도 개선: 텍스트 출력 간격을 10으로 유지
let textStep = 10;        
let mosaicText = "*";   

// --- 잔상 효과를 위한 변수 ---
let presenceBuffer; 
let numCols;        
let numRows;        

let maxPresence = 255.0; 
let growRate = 60.0;    
let fadeRate = 40.0;    

// 성능 최적화: 해상도를 320x240으로 유지
const CAM_WIDTH = 320; 
const CAM_HEIGHT = 240; 

// ----------------------------------------------------
// 1. 초기 설정 (setup)
// ----------------------------------------------------
function setup() {
  createCanvas(CAM_WIDTH, CAM_HEIGHT); 
  frameRate(10); 

  targetColor = color(255, 0, 0); 
  
  // 변경된 checkCellSize(40) 기준으로 격자 재계산
  numCols = ceil(width / checkCellSize);
  numRows = ceil(height / checkCellSize);
  
  presenceBuffer = new Array(numCols);
  for (let i = 0; i < numCols; i++) {
    presenceBuffer[i] = new Array(numRows).fill(0);
  }

  // 웹캠 설정: 해상도와 비율(4:3)을 강제 요청하여 왜곡을 방지합니다.
  cam = createCapture({
    video: {
      width: { exact: CAM_WIDTH }, 
      height: { exact: CAM_HEIGHT },
      // 비율 왜곡 방지 옵션 유지
      aspectRatio: { min: CAM_WIDTH / CAM_HEIGHT, max: CAM_WIDTH / CAM_HEIGHT } 
    }, 
    audio: false 
  });
  
  cam.size(CAM_WIDTH, CAM_HEIGHT);
  cam.hide(); 
  
  textAlign(CENTER, CENTER);
  textSize(25); // 텍스트 크기 25 유지
}

// ----------------------------------------------------
// 2. 그리기 루프 (draw)
// ----------------------------------------------------
function draw() {
  
  background(0); 

  if (cam && cam.loadedmetadata) {
    cam.loadPixels();
    
    // --- Phase 1: 잔상 버퍼 업데이트 (감쇠) ---
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numRows; j++) {
        presenceBuffer[i][j] -= fadeRate; 
        presenceBuffer[i][j] = max(0, presenceBuffer[i][j]); 
      }
    }

    // --- Phase 2: 색상 검출 및 생명력 증가 (checkCellSize=40으로 정밀 검출) ---
    for (let x = 0; x < width; x += checkCellSize) {
      for (let y = 0; y < height; y += checkCellSize) {
        
        let i = floor(x / checkCellSize); 
        let j = floor(y / checkCellSize); 
        
        let pixelColor = cam.get(x + checkCellSize/2, y + checkCellSize/2);
        
        let d = dist(red(pixelColor), green(pixelColor), blue(pixelColor), 
                     red(targetColor), green(targetColor), blue(targetColor));
        
        if (d < threshold) { // 임계값(100)보다 작으면 생명력 증가
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
    filter(GRAY); 
              
    pop();

    // --------------------------------------------------
    // Phase 3: 잔상 버퍼 값에 비례하여 텍스트 그리기 (textStep=10으로 촘촘하게)
    // --------------------------------------------------
    noStroke();
    
    for (let x = 0; x < width; x += textStep) {
      for (let y = 0; y < height; y += textStep) {
        
        // 격자 인덱스는 checkCellSize(40) 기준으로 계산
        let i = floor(x / checkCellSize);
        let j = floor(y / checkCellSize);

        if (i >= numCols || j >= numRows) continue;

        let currentPresence = presenceBuffer[i][j];
        
        if (currentPresence > 0) { // 활성화된 40x40 영역에만 텍스트 생성
          
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
