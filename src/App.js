import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { SketchPicker } from 'react-color';
import Draggable from 'react-draggable';
import './App.css';

const socket = io(process.env.KOYEB_INSTANCE_URL);

function App() {
    const [board, setBoard] = useState([]);
    const [currentColor, setCurrentColor] = useState("#000000");
    const [selectedPixel, setSelectedPixel] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
    const [tempBoard, setTempBoard] = useState([]);
    const [pickerKey, setPickerKey] = useState(0);

    useEffect(() => {
        socket.on('initial_board', board => {
            setBoard(board);
            setTempBoard(board);
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

    }, []);

    const handlePixelClick = (x, y, event) => {
        if (showPicker) {
            cancelColorChange();
        }
    
        setSelectedPixel({ x, y });
        setShowPicker(true);
    
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const pickerWidth = 300; // 팔레트의 대략적인 너비
        const pickerHeight = 400; // 팔레트의 대략적인 높이
    
        let pickerX, pickerY;
    
        if (event.clientX < windowWidth / 2) {
            // 클릭 위치가 화면 중앙 왼쪽에 있을 경우, 팔레트를 오른쪽에 표시
            pickerX = event.clientX + 20;
        } else {
            // 클릭 위치가 화면 중앙 오른쪽에 있을 경우, 팔레트를 왼쪽에 표시
            pickerX = event.clientX - pickerWidth - 20;
        }
    
        if (event.clientY < windowHeight / 2) {
            // 클릭 위치가 화면 중앙 위쪽에 있을 경우, 팔레트를 아래쪽에 표시
            pickerY = event.clientY + 20;
        } else {
            // 클릭 위치가 화면 중앙 아래쪽에 있을 경우, 팔레트를 위쪽에 표시
            pickerY = event.clientY - pickerHeight - 20;
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
        event.preventDefault(); // 기본 이벤트를 방지
        if (selectedPixel) {
            const { x, y } = selectedPixel;
            socket.emit('change_color', { x, y, color: currentColor });
            setSelectedPixel(null);
            setShowPicker(false);
        }
    };

    const cancelColorChange = () => {
        setSelectedPixel(null);
        setShowPicker(false);
        setTempBoard(board);
    };

    return (
        <div className="App">
            <h1>시험 기간에 미쳐봅시다</h1>
            <p style={{ fontSize: '14px', color: 'gray', marginTop: '3px' }}>made by 100_heon</p>
            {showPicker && (
                <Draggable key={pickerKey} defaultPosition={pickerPosition}>
                    <div className="picker-container" style={{ position: 'absolute', zIndex: 1000, background: '#fff', padding: '10px', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.2)' }}>
                        <SketchPicker color={currentColor} onChange={handleColorChange} />
                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <button onTouchEnd={confirmColorChange} onClick={confirmColorChange} style={{ marginRight: '10px' }}>확인</button>
                            <button onClick={cancelColorChange}>취소</button>
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
