import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { SketchPicker } from 'react-color';
import Draggable from 'react-draggable';
import './App.css';

const socket = io('http://localhost:4000');

function App() {
    const [board, setBoard] = useState([]);
    const [currentColor, setCurrentColor] = useState("#000000");
    const [selectedPixel, setSelectedPixel] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
    const [tempBoard, setTempBoard] = useState([]);
    const [pickerKey, setPickerKey] = useState(0); // 팔레트 위치를 강제로 업데이트하기 위한 상태

    useEffect(() => {
        // 초기 보드 설정 (50 x 70)
        const initialBoard = Array(50).fill().map(() => Array(70).fill("#FFFFFF"));
        setBoard(initialBoard);
        setTempBoard(initialBoard);

        socket.on('initial_board', board => {
            console.log('Received board data:', board);
            if (Array.isArray(board)) {
                setBoard(board);
                setTempBoard(board);
            } else {
                console.error('Received board data is not an array:', board);
            }
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

        setPickerPosition({ x: event.clientX + 20, y: event.clientY + 20 });
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

    const confirmColorChange = () => {
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
            <h1>픽셀을 클릭하여 색상 선택하기</h1>
            {showPicker && (
                <Draggable key={pickerKey} defaultPosition={pickerPosition}>
                    <div className="picker-container" style={{ position: 'absolute', zIndex: 1000, background: '#fff', padding: '10px', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.2)' }}>
                        <SketchPicker color={currentColor} onChange={handleColorChange} />
                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <button onClick={confirmColorChange} style={{ marginRight: '10px' }}>확인</button>
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
