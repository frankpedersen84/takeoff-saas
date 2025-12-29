import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, PerspectiveCamera } from '@react-three/drei';
import BuildingHologram from './BuildingHologram';

const PremierScene = ({ project, systems }) => {
    return (
        <div className="w-full h-full bg-black relative rounded-2xl overflow-hidden border border-gray-700 shadow-[0_0_50px_rgba(45,212,191,0.1)]">
            {/* HUD OVERLAY */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-emerald-400 font-mono text-xl tracking-widest uppercase">Premier<span className="text-white">_Vis</span> v1.0</h3>
                        <div className="text-xs text-emerald-500/50 font-mono mt-1">SYS.ONLINE // RENDERING</div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold text-white/90">{project?.name || 'UNKNOWN PROJECT'}</div>
                        <div className="text-emerald-400/80 font-mono">{project?.city}</div>
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                            <span className="text-xs text-gray-400 font-mono">FIRE_ALARM.SYS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_blue]"></div>
                            <span className="text-xs text-gray-400 font-mono">DATA_NET.SYS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_emerald]"></div>
                            <span className="text-xs text-gray-400 font-mono">SECURITY.SYS</span>
                        </div>
                    </div>
                    <div className="font-mono text-xs text-emerald-500/30">
                        CAM_POS: ORBIT<br />
                        ZOOM: ENABLED<br />
                        ROTATION: AUTO
                    </div>
                </div>
            </div>

            <Canvas>
                <Suspense fallback={null}>
                    <PerspectiveCamera makeDefault position={[60, 40, 60]} fov={50} />
                    <OrbitControls
                        autoRotate
                        autoRotateSpeed={0.5}
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2}
                        minDistance={30}
                        maxDistance={150}
                    />

                    <ambientLight intensity={0.5} color="#00ffcc" />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00cccc" />

                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                    <BuildingHologram project={project} systems={systems} />

                    <Environment preset="city" />

                    {/* Grid Floor */}
                    <gridHelper args={[200, 50, 0x115e59, 0x0f172a]} position={[0, -20, 0]} />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default PremierScene;
