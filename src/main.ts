const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const lostScreen = document.getElementById("lost") as HTMLDivElement;
const restartButton = document.getElementById("restart") as HTMLButtonElement;

const canvasSize = 1024;
const blockHeight = 25;
const hexSize = 10;
const laneSize = 8;
const laneCount = 6;
const tickRate = 5;
const matchSize = 3;
const extraRoom = 3;
const fontSize = 30;

const Color = ["#ef4444", "#84cc16", "#0ea5e9", "#eab308"] as const;
type Color = typeof Color[number];

let lanes: (Color | null)[][] = Array(laneCount)
    .fill([])
    .map(() => Array(laneSize + extraRoom).fill(null));

let attachedLanes: (Color | null)[][] = Array(laneCount)
    .fill([])
    .map(() => Array(laneSize).fill(null));

let rotation = 0;
let score = 0;
let tick = 0;

/**
 * Returns blocks of attachedLanes that are same color and connected to each other
 * @param lane
 * @param block
 * @returns array of `[lane, block]` pairs
 */
function floodFill(color: Color, startLane: number, startBlock: number): [number, number][] {
    const visited: [number, number][] = [];
    const toVisit: [number, number][] = [[startLane, startBlock]];
    while (toVisit.length > 0) {
        const [lane, block] = toVisit.shift()!;
        if (
            visited.some(
                ([visitedLane, visitedBlock]) => visitedLane === lane && visitedBlock === block
            )
        )
            continue;
        visited.push([lane, block]);
        if (attachedLanes[(lane - 1 + laneCount) % 6][block] === color) {
            toVisit.push([(lane - 1 + laneCount) % 6, block]);
        }
        if (attachedLanes[(lane + 1) % 6][block] === color) {
            toVisit.push([(lane + 1) % 6, block]);
        }
        if (block !== 0 && attachedLanes[lane][block - 1] === color) {
            toVisit.push([lane, block - 1]);
        }
        if (block !== laneSize - 1 && attachedLanes[lane][block + 1] === color) {
            toVisit.push([lane, block + 1]);
        }
    }
    return visited;
}

function runTick() {
    for (const laneIndex in attachedLanes) {
        const laneIndexNumber = Number(laneIndex);
        const lane = attachedLanes[laneIndexNumber];
        for (const blockIndex in lane) {
            const blockIndexNumber = Number(blockIndex);
            const block = lane[blockIndexNumber];
            if (!block) continue;
            const group = floodFill(block, laneIndexNumber, blockIndexNumber);
            if (group.length >= matchSize) {
                score += group.length;
                for (const [lane, block] of group) {
                    attachedLanes[lane][block] = null;
                }
                const groupLanes = [...new Set(group.map(([lane]) => lane))];
                for (const affactedLane of groupLanes) {
                    let floating = false;
                    for (
                        let floatingCandidateIndex = 0;
                        floatingCandidateIndex < laneSize;
                        floatingCandidateIndex += 1
                    ) {
                        const block = attachedLanes[affactedLane][floatingCandidateIndex];
                        if (!block) floating = true;
                        else if (floating) {
                            attachedLanes[affactedLane][floatingCandidateIndex] = null;
                            lanes[(affactedLane - rotation + 6) % 6][floatingCandidateIndex] = block;
                        }
                    }
                }
            }
        }
    }

    for (const laneIndex in lanes) {
        const laneIndexNumber = Number(laneIndex);
        const attachedLaneIndex = (laneIndexNumber + rotation) % laneCount;
        const lane = lanes[laneIndexNumber];
        for (const blockIndex in lane) {
            const blockIndexNumber = Number(blockIndex);
            const block = lane[blockIndexNumber];
            if (!block) continue;
            if (blockIndexNumber !== 0 && !attachedLanes[attachedLaneIndex][blockIndexNumber - 1]) {
                lane[blockIndexNumber - 1] = block;
                lane[blockIndexNumber] = null;
            } else {
                if (blockIndexNumber === laneSize) {
                    attachedLanes[attachedLaneIndex][blockIndexNumber] = block;
                    lane[blockIndexNumber] = null;
                    lose();
                }
                attachedLanes[attachedLaneIndex][blockIndexNumber] = block;
                lane[blockIndexNumber] = null;
            }
        }
    }

    if (tick % 10 === 0) {
        let spawnCount = 0;
        const random = Math.random();
        if (random < 0.5) spawnCount = 1;
        else if (random < 0.8) spawnCount = 2;
        else if (random < 0.95) spawnCount = 3;
        else spawnCount = 4;
        const usedLanes: number[] = [];
        for (let i = 0; i < spawnCount; i++) {
            const lane = Math.floor(Math.random() * laneCount);
            if (usedLanes.includes(lane)) {
                i--;
                continue;
            }
            usedLanes.push(lane);
            const color = Color[Math.floor(Math.random() * Color.length)];
            lanes[lane][laneSize + extraRoom - 1] = color;
        }
    }

    tick++;
}

let gameLoop = setInterval(runTick, 1000 / tickRate);

window.addEventListener("keydown", handleKeyDown);
function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
        case "ArrowLeft":
            rotation = (rotation + laneCount + 1) % laneCount;
            break;
        case "ArrowRight":
            rotation = (rotation + laneCount - 1) % laneCount;
            break;
    }

    for (const laneIndex in lanes) {
        const laneIndexNumber = Number(laneIndex);
        const attachedLaneIndex = (laneIndexNumber + rotation) % laneCount;
        const lane = lanes[laneIndexNumber];
        for (const blockIndex in lane) {
            const blockIndexNumber = Number(blockIndex);
            const block = lane[blockIndexNumber];
            if (!block) continue;
            if (attachedLanes[attachedLaneIndex][blockIndexNumber]) {
                const highest = attachedLanes[attachedLaneIndex].findIndex((block) => !block);
                if (highest !== -1) {
                    attachedLanes[attachedLaneIndex][highest] = block;
                    lane[blockIndexNumber] = null;
                } else {
                    attachedLanes[attachedLaneIndex][laneSize] = block;
                    lane[blockIndexNumber] = null;
                    lose();
                }
            }
        }
    }
}

function lose() {
    clearInterval(gameLoop);
    window.removeEventListener("keydown", handleKeyDown);
    lostScreen.style.visibility = "visible";
}

restartButton.addEventListener("click", () => {
    lanes = Array(laneCount)
        .fill([])
        .map(() => Array(laneSize + extraRoom).fill(null));

    attachedLanes = Array(laneCount)
        .fill([])
        .map(() => Array(laneSize).fill(null));

    rotation = 0;
    score = 0;
    tick = 0;

    gameLoop = setInterval(runTick, 1000 / tickRate);

    window.addEventListener("keydown", handleKeyDown);

    lostScreen.style.visibility = "hidden";
});

function draw() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = "#9ca3af";
    ctx.beginPath();
    for (let i = 0; i < laneCount; i++) {
        const angle = (i / laneCount) * Math.PI * 2;
        const x =
            canvasSize / 2 + Math.cos(angle) * (canvasSize / hexSize + laneSize * blockHeight);
        const y =
            canvasSize / 2 + Math.sin(angle) * (canvasSize / hexSize + laneSize * blockHeight);
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4b5563";
    ctx.beginPath();
    for (let i = 0; i < laneCount; i++) {
        const angle = (i / laneCount) * Math.PI * 2;
        const x = canvasSize / 2 + (Math.cos(angle) * canvasSize) / hexSize;
        const y = canvasSize / 2 + (Math.sin(angle) * canvasSize) / hexSize;
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    for (const laneIndex in attachedLanes) {
        const lane = attachedLanes[laneIndex];
        for (const blockIndex in lane) {
            const block = lane[blockIndex];
            if (!block) continue;
            const leftAngle = ((Number(laneIndex) - rotation) / 6) * Math.PI * 2;
            const rightAngle = ((Number(laneIndex) + 1 - rotation) / 6) * Math.PI * 2;
            const bottomLeftX =
                canvasSize / 2 +
                Math.cos(leftAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const bottomLeftY =
                canvasSize / 2 +
                Math.sin(leftAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const bottomRightX =
                canvasSize / 2 +
                Math.cos(rightAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const bottomRightY =
                canvasSize / 2 +
                Math.sin(rightAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const topLeftX =
                canvasSize / 2 +
                Math.cos(leftAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);
            const topLeftY =
                canvasSize / 2 +
                Math.sin(leftAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);
            const topRightX =
                canvasSize / 2 +
                Math.cos(rightAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);
            const topRightY =
                canvasSize / 2 +
                Math.sin(rightAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);

            ctx.fillStyle = block;
            ctx.beginPath();
            ctx.moveTo(bottomLeftX, bottomLeftY);
            ctx.lineTo(bottomRightX, bottomRightY);
            ctx.lineTo(topRightX, topRightY);
            ctx.lineTo(topLeftX, topLeftY);
            ctx.closePath();
            ctx.fill();
        }
    }

    for (const laneIndex in lanes) {
        const lane = lanes[laneIndex];
        for (const blockIndex in lane) {
            const block = lane[blockIndex];
            if (!block) continue;
            const leftAngle = (Number(laneIndex) / 6) * Math.PI * 2;
            const rightAngle = ((Number(laneIndex) + 1) / 6) * Math.PI * 2;
            const bottomLeftX =
                canvasSize / 2 +
                Math.cos(leftAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const bottomLeftY =
                canvasSize / 2 +
                Math.sin(leftAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const bottomRightX =
                canvasSize / 2 +
                Math.cos(rightAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const bottomRightY =
                canvasSize / 2 +
                Math.sin(rightAngle) * (canvasSize / hexSize + Number(blockIndex) * blockHeight);
            const topLeftX =
                canvasSize / 2 +
                Math.cos(leftAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);
            const topLeftY =
                canvasSize / 2 +
                Math.sin(leftAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);
            const topRightX =
                canvasSize / 2 +
                Math.cos(rightAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);
            const topRightY =
                canvasSize / 2 +
                Math.sin(rightAngle) *
                    (canvasSize / hexSize + (Number(blockIndex) + 1) * blockHeight);

            ctx.fillStyle = block;
            ctx.beginPath();
            ctx.moveTo(bottomLeftX, bottomLeftY);
            ctx.lineTo(bottomRightX, bottomRightY);
            ctx.lineTo(topRightX, topRightY);
            ctx.lineTo(topLeftX, topLeftY);
            ctx.closePath();
            ctx.fill();
        }
    }

    ctx.font = `bold ${fontSize}px arial`;
    ctx.fillStyle = "#e5e7eb";
    ctx.textAlign = "center";
    ctx.fillText(score.toString(), canvasSize / 2, canvasSize / 2 + fontSize / 2);

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
