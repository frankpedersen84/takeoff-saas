import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html, Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const BuildingHologram = ({ project, systems }) => {
    const group = useRef();

    // Rotating the whole building slowly
    useFrame((state) => {
        if (group.current) {
            group.current.rotation.y += 0.002;
        }
    });

    // Generate procedural floors based on project data or default
    const floors = useMemo(() => {
        const floorCount = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 3)); // Mock 3-8 floors
        const width = 60;
        const depth = 40;
        const height = 4;

        return Array.from({ length: floorCount }).map((_, i) => ({
            y: (i * height) - ((floorCount * height) / 2),
            level: i + 1
        }));
    }, [project]);

    // Generate "Device Nodes" (floating orbs)
    const devices = useMemo(() => {
        // Determine system colors
        const getSystemColor = (name) => {
            if (name?.includes('Fire')) return '#ef4444';
            if (name?.includes('Data')) return '#3b82f6';
            if (name?.includes('Security')) return '#10b981';
            return '#f59e0b';
        };

        const nodes = [];
        const count = 50; // default particle count

        for (let i = 0; i < count; i++) {
            const floorIdx = Math.floor(Math.random() * floors.length);
            const floor = floors[floorIdx];

            nodes.push({
                position: [
                    (Math.random() - 0.5) * 50, // x
                    floor.y + 1,                // y
                    (Math.random() - 0.5) * 30  // z
                ],
                color: getSystemColor(Object.keys(project?.systems || {})[i % 4] || 'Data'),
                size: Math.random() * 0.5 + 0.2
            });
        }
        return nodes;
    }, [floors, project]);

    return (
        <group ref={group}>
            {/* FLOORS (Wireframes) */}
            {floors.map((floor, i) => (
                <group key={i} position={[0, floor.y, 0]}>
                    {/* Floor Plate */}
                    <Box args={[60, 0.2, 40]}>
                        <meshStandardMaterial
                            color="#0d9488"
                            transparent
                            opacity={0.1}
                            wireframe={false}
                        />
                    </Box>
                    <Box args={[60, 0.2, 40]}>
                        <meshBasicMaterial color="#0d9488" wireframe opacity={0.3} transparent />
                    </Box>

                    {/* Columns */}
                    <Box position={[29, 2, 19]} args={[1, 4, 1]}>
                        <meshBasicMaterial color="#0f766e" wireframe opacity={0.2} transparent />
                    </Box>
                    <Box position={[-29, 2, 19]} args={[1, 4, 1]}>
                        <meshBasicMaterial color="#0f766e" wireframe opacity={0.2} transparent />
                    </Box>
                    <Box position={[29, 2, -19]} args={[1, 4, 1]}>
                        <meshBasicMaterial color="#0f766e" wireframe opacity={0.2} transparent />
                    </Box>
                    <Box position={[-29, 2, -19]} args={[1, 4, 1]}>
                        <meshBasicMaterial color="#0f766e" wireframe opacity={0.2} transparent />
                    </Box>

                    {/* Floor Label */}
                    <Text
                        position={[-32, 0, 20]}
                        fontSize={2}
                        color="#2dd4bf"
                        fillOpacity={0.7}
                    >
                        L{floor.level}
                    </Text>
                </group>
            ))}

            {/* DEVICES (Particles) */}
            {devices.map((node, i) => (
                <Sphere key={i} position={node.position} args={[node.size, 16, 16]}>
                    <meshStandardMaterial
                        color={node.color}
                        emissive={node.color}
                        emissiveIntensity={2}
                        toneMapped={false}
                    />
                </Sphere>
            ))}

            {/* CENTER CORE */}
            <Box args={[10, floors.length * 4, 10]} position={[0, 0, 0]}>
                <meshBasicMaterial color="#ccfbf1" wireframe opacity={0.05} transparent />
            </Box>

        </group>
    );
};

export default BuildingHologram;
