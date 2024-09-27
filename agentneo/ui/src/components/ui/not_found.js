import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    useEffect(() => {
        const matrixCode = () => {
            const canvas = document.getElementById('matrix-code');
            const ctx = canvas.getContext('2d');

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
            const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const nums = '0123456789';

            const alphabet = katakana + latin + nums;

            const fontSize = 16;
            const columns = canvas.width / fontSize;

            const rainDrops = [];

            for (let x = 0; x < columns; x++) {
                rainDrops[x] = 1;
            }

            const draw = () => {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#0F0';
                ctx.font = fontSize + 'px monospace';

                for (let i = 0; i < rainDrops.length; i++) {
                    const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
                    ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

                    if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                        rainDrops[i] = 0;
                    }
                    rainDrops[i]++;
                }
            };

            setInterval(draw, 30);
        };

        matrixCode();
    }, []);

    return (
        <div className="relative h-screen bg-black text-green-500 font-mono overflow-hidden">
            <canvas id="matrix-code" className="absolute inset-0"></canvas>
            <div className="relative z-10 flex items-center justify-center h-full">
                <div className="text-center">
                    <h1 className="text-9xl font-bold mb-8">404</h1>
                    <p className="text-3xl mb-8">SYSTEM FAILURE: PAGE NOT FOUND</p>
                    <p className="text-xl mb-12">
                        The page you're looking for has been disconnected from the Matrix.
                    </p>
                    <div className="space-x-4">
                        <Link
                            to="/"
                            className="bg-green-500 text-black px-6 py-3 rounded hover:bg-green-600 transition duration-300"
                        >
                            RETURN TO MAINFRAME
                        </Link>
                        <Link
                            to="/dashboard"
                            className="border border-green-500 text-green-500 px-6 py-3 rounded hover:bg-green-500 hover:text-black transition duration-300"
                        >
                            ENTER THE MATRIX
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;