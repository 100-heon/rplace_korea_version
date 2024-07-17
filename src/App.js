import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { SketchPicker } from 'react-color';
import Draggable from 'react-draggable';
import './App.css';

const socket = io(process.env.KOYEB_INSTANCE_URL);

function App() {
    const [board, setBoard] = useState(Array(100).fill().map(() => Array(270).fill("#FFFFFF")));
    const [tempBoard, setTempBoard] = useState(board); // 임시 보드 상태 추가
    const [currentColor, setCurrentColor] = useState("#000000");
    const [selectedPixel, setSelectedPixel] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
    const [pickerKey, setPickerKey] = useState(0);

    useEffect(() => {
        socket.on('initial_board', board => {
            setBoard(board);
            setTempBoard(board); // 초기 보드 상태 설정
        });

        socket.on('change_color', data => {
            setBoard(prevBoard => {
                const { x, y, color } = data;
                const newBoard = [...prevBoard];
                newBoard[y][x] = color;
                return newBoard;
            });
            setTempBoard(prevBoard => {
                const { x, y, color } = data;
                const newBoard = [...prevBoard];
                newBoard[y][x] = color;
                return newBoard;
            });
        });

        const handleEnterPress = (event) => {
            if (event.key === 'Enter' && showPicker) {
                confirmColorChange(event);
            }
        };

        window.addEventListener('keydown', handleEnterPress);
        return () => {
            window.removeEventListener('keydown', handleEnterPress);
        };
    }, [showPicker]);

    const handlePixelClick = (x, y, event) => {
        if (showPicker) {
            cancelColorChange();
        }

        setSelectedPixel({ x, y });
        setShowPicker(true);

        const pixelSize = 10; // 픽셀의 크기
        const gap = 40; // 팔레트와 픽셀 사이의 간격
        const pickerWidth = 200; // 팔레트의 너비
        const pickerHeight = 250; // 팔레트의 높이

        const boardContainer = event.currentTarget.parentNode;
        const boardRect = boardContainer.getBoundingClientRect();

        const clickedPixelX = boardRect.left + (x * pixelSize) - window.pageXOffset;
        const clickedPixelY = boardRect.top + (y * pixelSize) - window.pageYOffset;

        let pickerX = clickedPixelX + gap; // 기본적으로 픽셀 오른쪽에 위치
        let pickerY = clickedPixelY + gap; // 기본적으로 픽셀 아래에 위치

        if (pickerX + pickerWidth > window.innerWidth) {
            pickerX = clickedPixelX - pickerWidth - gap;
        }
        if (pickerY + pickerHeight > window.innerHeight) {
            pickerY = clickedPixelY - pickerHeight - gap;
        }

        setPickerPosition({ x: pickerX, y: pickerY });
        setPickerKey(prevKey => prevKey + 1);
    };

    const handleColorChange = (color) => {
        setCurrentColor(color.hex);
        if (selectedPixel) {
            const { x, y } = selectedPixel;
            setTempBoard(prevBoard => {
                const newBoard = prevBoard.map(row => [...row]);
                newBoard[y][x] = color.hex;
                return newBoard;
            });
        }
    };

    const confirmColorChange = (event) => {
        event.preventDefault();
        if (selectedPixel) {
            const { x, y } = selectedPixel;
            socket.emit('change_color', { x, y, color: currentColor });
            setBoard(tempBoard);
            setSelectedPixel(null);
            setShowPicker(false);
        }
    };

    const cancelColorChange = () => {
        setTempBoard(board);
        setSelectedPixel(null);
        setShowPicker(false);
    };

    useEffect(() => {
        const boardContainer = document.querySelector('.board-container');
        let startX, startY, scrollLeft, scrollTop, isDown;
    
        const handleTouchStart = (e) => {
            isDown = true; // 드래그 시작 플래그 설정
            startX = e.touches[0].pageX;
            startY = e.touches[0].pageY;
            scrollLeft = boardContainer.scrollLeft;
            scrollTop = boardContainer.scrollTop;
        };
    
        const handleTouchMove = (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX;
            const y = e.touches[0].pageY;
    
            // 움직인 거리 계산
            const walkX = (x - startX);
            const walkY = (y - startY);
    
            // 스크롤 업데이트
            boardContainer.scrollLeft = scrollLeft - walkX;
            boardContainer.scrollTop = scrollTop - walkY;
        };
    
        const handleTouchEnd = () => {
            isDown = false; // 드래그 종료 플래그 해제
        };
    
        boardContainer.addEventListener('touchstart', handleTouchStart);
        boardContainer.addEventListener('touchmove', handleTouchMove);
        boardContainer.addEventListener('touchend', handleTouchEnd);
    
        return () => {
            boardContainer.removeEventListener('touchstart', handleTouchStart);
            boardContainer.removeEventListener('touchmove', handleTouchMove);
            boardContainer.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);
    

    return (
        <div className="App">
            <h1>kr/place</h1>
            <p style={{ fontSize: '14px', color: 'gray', marginTop: '3px' }}>made by 100_heon</p>
            {showPicker && (
                <Draggable
                    key={pickerKey}
                    defaultPosition={pickerPosition}
                    cancel=".sketch-picker .saturation-white, .sketch-picker .saturation-black, .sketch-picker .hue-horizontal, .sketch-picker .alpha-horizontal">
                    <div className="picker-container" style={{ position: 'absolute', zIndex: 1000, background: '#fff', padding: '10px', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.2)' }}>
                        <SketchPicker color={currentColor} onChange={handleColorChange} className="sketch-picker" />
                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <button onTouchEnd={confirmColorChange} onClick={confirmColorChange} style={{ marginRight: '10px' }}>확인</button>
                            <button onClick={cancelColorChange} onTouchEnd={(e) => {e.preventDefault(); cancelColorChange();}} style={{ marginRight: '10px' }}>취소</button>
                        </div>
                    </div>
                </Draggable>
            )}
            <div className="board-container">
                <div className="pixel-board">
                    {tempBoard.map((row, y) => (
                        <div key={y} style={{ display: 'flex' }}>
                            {row.map((color, x) => (
                                <div key={x} onClick={(e) => handlePixelClick(x, y, e)}
                                    className="pixel"
                                    style={{
                                        backgroundColor: color,
                                        border: selectedPixel && selectedPixel.x === x && selectedPixel.y === y ? '2px solid red' : '1px solid black'
                                    }} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
