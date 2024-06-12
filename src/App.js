import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { SketchPicker } from 'react-color';
import Draggable from 'react-draggable';
import './App.css';

const socket = io(process.env.KOYEB_INSTANCE_URL);

function App() {
    const [board, setBoard] = useState(Array(100).fill().map(() => Array(230).fill("#FFFFFF")));
    const [currentColor, setCurrentColor] = useState("#000000");
    const [selectedPixel, setSelectedPixel] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
    const [pickerKey, setPickerKey] = useState(0);

    useEffect(() => {
        socket.on('initial_board', board => {
            setBoard(board);
        });

        socket.on('change_color', data => {
            setBoard(prevBoard => {
                const { x, y, color } = data;
                const newBoard = [...prevBoard];
                newBoard[y][x] = color;
                return newBoard;
            });
        });

        // Handle enter key press
        const handleEnterPress = (event) => {
            if (event.key === 'Enter' && showPicker) {
                confirmColorChange(event);
            }
        };

        window.addEventListener('keydown', handleEnterPress);
        return () => {
            window.removeEventListener('keydown', handleEnterPress);
        };
    }, [showPicker]); // Re-bind event listener if showPicker changes

    const handlePixelClick = (x, y, event) => {
        if (showPicker) {
            cancelColorChange();
        }

        setSelectedPixel({ x, y });
        setShowPicker(true);

        const pixelSize = 20; // 픽셀의 크기
        const gap = 40; // 팔레트와 픽셀 사이의 간격
        const pickerWidth = 200; // 팔레트의 너비
        const pickerHeight = 250; // 팔레트의 높이

        const boardContainer = event.currentTarget.parentNode;
        const boardRect = boardContainer.getBoundingClientRect();

        const clickedPixelX = boardRect.left + (x * pixelSize) - window.pageXOffset;
        const clickedPixelY = boardRect.top + (y * pixelSize) - window.pageYOffset;

        let pickerX = clickedPixelX + gap;
        let pickerY = clickedPixelY + gap;

        if (pickerX + pickerWidth > window.innerWidth + window.pageXOffset) {
            pickerX = clickedPixelX - pickerWidth - gap;
        }
        if (pickerY + pickerHeight > window.innerHeight + window.pageYOffset) {
            pickerY = clickedPixelY - pickerHeight - gap;
        }

        setPickerPosition({ x: pickerX, y: pickerY });
        setPickerKey(prevKey => prevKey + 1);
    };

    const handleColorChange = (color) => {
        setCurrentColor(color.hex);
        if (selectedPixel) {
            setBoard(prevBoard => {
                const newBoard = prevBoard.map(row => [...row]);
                newBoard[selectedPixel.y][selectedPixel.x] = color.hex;
                return newBoard;
            });
        }
    };

    const confirmColorChange = (event) => {
        event.preventDefault();
        if (selectedPixel) {
            socket.emit('change_color', { x: selectedPixel.x, y: selectedPixel.y, color: currentColor });
            setSelectedPixel(null);
            setShowPicker(false);
        }
    };

    const cancelColorChange = () => {
        setSelectedPixel(null);
        setShowPicker(false);
    };

    return (
        <div className="App">
            <h1>시험 기간에 미쳐봅시다</h1>
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
                    {board.map((row, y) => (
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
