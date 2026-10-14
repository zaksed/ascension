/**
 * Illustrations originales de la Partie 1 (une par question). Chaque scène correspond au
 * champ media.scene des questions de content/toeic/part1.json ; la description textuelle
 * (media.alt) est affichée en secours et lue par les lecteurs d'écran.
 */
import type { ReactNode } from 'react';
import { ARMS, Bicycle, Books, Box, C, Car, Chair, Clock, Cup, Desk, Outdoor, Person, Plant, Room, Shelves, SKIN, Tree, Window } from './scenePrimitives';

const scenes: Record<string, () => ReactNode> = {
  'woman-typing-laptop': () => (
    <Room floorY={185}>
      <Window x={250} y={30} w={100} h={80} />
      <Person x={170} y={240} pose="sit" hideLegs hairStyle="long" hair="#5a3825" top="#c2546b" armL={ARMS.typing} armR={ARMS.typing} />
      <Desk x={80} y={182} w={220} h={70} />
      <g transform="translate(142 182)">
        <path d="M0 0 L6 -34 L52 -34 L58 0 Z" fill="#475569" />
        <circle cx={29} cy={-18} r={4} fill="#94a3b8" />
      </g>
      <Cup x={252} y={182} />
    </Room>
  ),
  'chairs-stacked': () => (
    <Room floorY={180}>
      <Window x={270} y={35} w={90} h={75} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Chair key={i} x={150} y={236 - i * 11} color={i % 2 ? '#3f7d7a' : '#4a8f8b'} />
      ))}
      <rect x={60} y={232} width={300} height={4} fill={C.floorDark} opacity={0.5} />
    </Room>
  ),
  'man-watering-plants': () => (
    <Room floorY={180} wall="#eef3e8">
      <Window x={40} y={30} w={90} h={70} />
      <rect x={210} y={196} width={150} height={10} fill={C.wood} />
      <rect x={218} y={206} width={8} height={30} fill={C.woodDark} />
      <rect x={344} y={206} width={8} height={30} fill={C.woodDark} />
      <Plant x={240} y={196} s={0.9} />
      <Plant x={285} y={196} s={1} />
      <Plant x={330} y={196} s={0.85} />
      <Person x={150} y={240} hair="#2b2b2b" top="#4b7f52" armR={[14, 14, 34, 2]} />
      <g transform="translate(196 140) rotate(18)">
        <path d="M-14 0 h28 v24 h-28 z" fill="#3e88c7" />
        <path d="M14 6 L40 -4 L42 0 L16 12 Z" fill="#3e88c7" />
        <path d="M-14 4 q-10 8 0 16" stroke="#2c6da3" strokeWidth={3} fill="none" />
      </g>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={240 + i * 5} cy={150 + i * 9} r={2} fill={C.water} />
      ))}
    </Room>
  ),
  'handshake-office': () => (
    <Room floorY={180}>
      <Window x={40} y={30} w={100} h={80} />
      <Plant x={345} y={238} s={1.3} />
      <Person x={160} y={240} hair="#1f1a17" top="#34495e" bottom="#2c3e50" armR={ARMS.shake} />
      <Person x={240} y={240} hairStyle="bun" hair="#6b4226" skin={SKIN[1]} top="#7a4ea3" skirt bottom="#3b3355" armL={ARMS.shake} />
    </Room>
  ),
  'bicycles-rack': () => (
    <Outdoor horizon={170} ground={C.pavement}>
      <rect x={20} y={20} width={360} height={150} fill="#d8c3a5" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={45 + i * 90} y={40} width={50} height={60} fill={C.glass} stroke="#b59c7e" strokeWidth={4} />
      ))}
      <rect x={170} y={110} width={60} height={60} fill="#8d6e53" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${90 + i * 70} 232 v-34 a14 14 0 0 1 28 0 v34`} stroke={C.metalDark} strokeWidth={4} fill="none" />
      ))}
      <Bicycle x={115} y={236} color="#d9534f" />
      <Bicycle x={185} y={236} color="#2c7fb8" />
      <Bicycle x={255} y={236} color="#5cb85c" />
    </Outdoor>
  ),
  'presenter-chart': () => (
    <Room floorY={190}>
      <rect x={215} y={25} width={160} height={110} fill={C.white} stroke="#94a3b8" strokeWidth={3} />
      {[40, 70, 55, 95].map((h, i) => (
        <rect key={i} x={235 + i * 33} y={125 - h} width={22} height={h} fill={['#60a5fa', '#34d399', '#fbbf24', '#f87171'][i]} />
      ))}
      <line x1={230} y1={125} x2={362} y2={125} stroke="#64748b" strokeWidth={2} />
      <Person x={180} y={232} hairStyle="long" hair="#3d2b1f" top="#0f766e" skirt bottom="#1f2937" armR={[16, -10, 32, -26]} />
      <Person x={60} y={290} pose="sit" back hair="#2d2d2d" top="#64748b" hideLegs />
      <Person x={140} y={292} pose="sit" back hair="#8b5a2b" top="#a16207" hideLegs />
      <Person x={320} y={290} pose="sit" back hair="#1f2937" top="#475569" hideLegs />
    </Room>
  ),
  'man-reading-bench': () => (
    <Outdoor horizon={150}>
      <Tree x={320} y={200} s={1.1} />
      <rect x={100} y={192} width={180} height={10} rx={3} fill={C.wood} />
      <rect x={100} y={168} width={180} height={8} rx={3} fill={C.wood} />
      <rect x={112} y={202} width={7} height={28} fill={C.metalDark} />
      <rect x={262} y={202} width={7} height={28} fill={C.metalDark} />
      <Person x={190} y={230} pose="sit" hair="#4a4a4a" top="#9a3b3b" bottom="#334155" armL={ARMS.holdHigh} armR={ARMS.holdHigh} />
      <g>
        <rect x={160} y={140} width={62} height={44} fill="#f5f2e9" stroke="#c7c2b5" />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={166} y1={150 + i * 7} x2={214} y2={150 + i * 7} stroke="#9ca3af" strokeWidth={2} />
        ))}
      </g>
    </Outdoor>
  ),
  'warehouse-shelves': () => (
    <Room floorY={200} wall="#dfe3e8" floor="#a7adb5">
      <Shelves
        x={40}
        y={200}
        w={260}
        h={180}
        rows={3}
        fill={(ry) => (
          <g>
            <Box x={52} y={ry} w={50} h={40} />
            <Box x={110} y={ry} w={44} h={34} color="#d1a86b" />
            <Box x={162} y={ry} w={56} h={42} />
            <Box x={226} y={ry} w={60} h={36} color="#d1a86b" />
          </g>
        )}
      />
      <g stroke={C.metalDark} strokeWidth={5}>
        <line x1={330} y1={232} x2={300} y2={50} />
        <line x1={360} y1={232} x2={330} y2={50} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={327 - i * 5} y1={210 - i * 30} x2={357 - i * 5} y2={210 - i * 30} strokeWidth={4} />
        ))}
      </g>
    </Room>
  ),
  'chef-stirring': () => (
    <Room floorY={200} wall="#f1efe9">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={i * 50} y={60} width={48} height={48} fill="none" stroke="#dcd6ca" />
      ))}
      <Person x={160} y={250} hat="chef" hair="#2f2f2f" skin={SKIN[2]} top={C.white} apron="#e5e7eb" hideLegs armR={ARMS.stir} />
      <rect x={60} y={180} width={300} height={80} fill="#9ca3af" />
      <rect x={60} y={176} width={300} height={8} fill="#6b7280" />
      <path d="M168 176 h50 v-30 h-50 z" fill="#4b5563" />
      <rect x={160} y={140} width={66} height={8} rx={3} fill="#374151" />
      <line x1={182} y1={160} x2={200} y2={120} stroke="#9a7b52" strokeWidth={4} strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${180 + i * 12} 132 q-6 -10 0 -20 q6 -10 0 -20`} stroke="#cbd5e1" strokeWidth={3} fill="none" opacity={0.8} />
      ))}
      <rect x={260} y={164} width={70} height={12} rx={3} fill={C.wood} />
      <ellipse cx={295} cy={160} rx={26} ry={11} fill="#d39c4f" />
    </Room>
  ),
  'meeting-room-empty': () => (
    <Room floorY={175}>
      <Window x={150} y={25} w={110} h={80} />
      <Chair x={150} y={190} color="#334155" />
      <Chair x={250} y={190} color="#334155" />
      <path d="M70 180 h260 l20 30 h-300 z" fill={C.wood} />
      <rect x={60} y={210} width={280} height={8} fill={C.woodDark} />
      <rect x={80} y={218} width={8} height={30} fill={C.woodDark} />
      <rect x={312} y={218} width={8} height={30} fill={C.woodDark} />
      <Chair x={40} y={248} color="#475569" />
      <Chair x={360} y={248} color="#475569" />
      <rect x={120} y={186} width={44} height={14} fill="#f8fafc" transform="rotate(-6 142 193)" />
      <rect x={132} y={190} width={44} height={14} fill="#eef2f7" transform="rotate(4 154 197)" />
      <rect x={220} y={190} width={56} height={8} rx={2} fill="#5c6878" />
    </Room>
  ),
  'woman-stepladder-shelf': () => (
    <Room floorY={200}>
      <rect x={210} y={20} width={150} height={180} fill={C.woodDark} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={214} y={58 + i * 45} width={142} height={5} fill={C.wood} />
          <Books x={220} y={58 + i * 45} n={i === 0 ? 12 : 10} />
        </g>
      ))}
      <g stroke="#9aa5b1" strokeWidth={5}>
        <line x1={150} y1={236} x2={170} y2={150} />
        <line x1={196} y1={236} x2={176} y2={150} />
        <line x1={156} y1={210} x2={190} y2={210} />
        <line x1={162} y1={182} x2={184} y2={182} />
      </g>
      <rect x={160} y={146} width={26} height={7} fill="#9aa5b1" />
      <Person x={173} y={147} s={0.85} hairStyle="long" hair="#2f1e14" skin={SKIN[3]} top="#e07a5f" bottom="#3d405b" armR={[8, -20, 26, -44]} />
      <path d="M50 236 h70 v-38 h-70 z" fill="#c99a5b" />
      <path d="M50 198 l-14 -14 h70 l14 14 z" fill="#d9b277" />
    </Room>
  ),
  'street-parked-cars': () => (
    <Outdoor horizon={140} ground={C.road}>
      <rect x={0} y={140} width={400} height={30} fill={C.pavement} />
      <Tree x={60} y={170} s={0.8} />
      <Tree x={200} y={170} s={0.85} />
      <Tree x={340} y={170} s={0.8} />
      <rect x={0} y={170} width={400} height={6} fill="#9ca3af" />
      <Car x={5} y={222} color="#c94c4c" />
      <Car x={140} y={222} color="#3b82f6" />
      <Car x={275} y={222} color="#f1f5f9" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={20 + i * 85} y={246} width={44} height={5} fill="#f8fafc" opacity={0.8} />
      ))}
    </Outdoor>
  ),
  'man-phone-desk': () => (
    <Room floorY={185}>
      <rect x={210} y={30} width={150} height={90} fill={C.white} stroke="#94a3b8" strokeWidth={4} />
      <path d="M228 60 q20 -14 40 0 t40 0" stroke="#3b82f6" strokeWidth={3} fill="none" />
      <path d="M232 90 h70" stroke="#ef4444" strokeWidth={3} />
      <Person x={160} y={240} pose="sit" hideLegs hair="#3a2d24" skin={SKIN[1]} top="#5b7db1" armR={ARMS.phone} armL={ARMS.typing}>
        <rect x={6} y={-150} width={7} height={22} rx={3} fill="#1f2937" />
      </Person>
      <Desk x={70} y={182} w={220} h={70} />
      <rect x={210} y={140} width={56} height={38} rx={3} fill="#334155" />
      <rect x={232} y={178} width={12} height={5} fill="#334155" />
    </Room>
  ),
  'cashier-bag': () => (
    <Room floorY={200} wall="#f3efe7">
      <Shelves x={20} y={160} w={110} h={130} rows={3} fill={(ry) => <Books x={30} y={ry} n={10} />} />
      <Person x={180} y={250} hideLegs hairStyle="bun" hair="#3b2416" skin={SKIN[2]} top="#dc2626" armR={[16, 10, 40, 6]} />
      <g transform="translate(228 132)">
        <path d="M0 0 h30 v34 h-30 z" fill="#c8a675" />
        <path d="M6 0 q9 -12 18 0" stroke="#a07f4f" strokeWidth={3} fill="none" />
      </g>
      <Person x={310} y={250} hair="#1c1c1c" top="#0f766e" bottom="#334155" armL={[12, 10, 34, 2]} />
      <rect x={110} y={170} width={180} height={90} fill="#8b6b4a" />
      <rect x={110} y={166} width={180} height={8} fill="#6d5236" />
      <rect x={130} y={140} width={46} height={28} rx={3} fill="#374151" />
      <rect x={136} y={146} width={34} height={10} fill="#86efac" />
    </Room>
  ),
  'table-set': () => (
    <Room floorY={175} wall="#f5eee6">
      <Window x={40} y={25} w={90} h={75} />
      <Plant x={350} y={238} s={1.2} />
      <Chair x={140} y={200} color="#7c4a2d" />
      <Chair x={260} y={200} color="#7c4a2d" />
      <path d="M70 186 h260 l10 50 h-280 z" fill={C.white} stroke="#e5e7eb" />
      <rect x={95} y={236} width={8} height={20} fill={C.woodDark} />
      <rect x={297} y={236} width={8} height={20} fill={C.woodDark} />
      <ellipse cx={140} cy={198} rx={30} ry={8} fill="#f8fafc" stroke="#cbd5e1" />
      <ellipse cx={260} cy={198} rx={30} ry={8} fill="#f8fafc" stroke="#cbd5e1" />
      <line x1={102} y1={192} x2={102} y2={206} stroke="#94a3b8" strokeWidth={2} />
      <line x1={178} y1={192} x2={178} y2={206} stroke="#94a3b8" strokeWidth={2} />
      <line x1={222} y1={192} x2={222} y2={206} stroke="#94a3b8" strokeWidth={2} />
      <line x1={298} y1={192} x2={298} y2={206} stroke="#94a3b8" strokeWidth={2} />
      <path d="M170 176 h10 l-2 16 h-6 z" fill={C.glass} stroke="#94a3b8" />
      <path d="M222 176 h10 l-2 16 h-6 z" fill={C.glass} stroke="#94a3b8" />
      <path d="M192 158 h16 l4 34 h-24 z" fill="#bfe3f5" stroke="#7aa8c0" />
    </Room>
  ),
  'woman-photocopier': () => (
    <Room floorY={195}>
      <rect x={200} y={110} width={130} height={126} rx={6} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
      <rect x={196} y={100} width={138} height={14} rx={3} fill="#cbd5e1" />
      <rect x={290} y={88} width={40} height={14} rx={3} fill="#475569" />
      <rect x={296} y={91} width={14} height={7} fill="#86efac" />
      <rect x={214} y={150} width={100} height={8} fill="#94a3b8" />
      <rect x={214} y={180} width={100} height={8} fill="#94a3b8" />
      <Person x={168} y={240} hairStyle="long" hair="#a0522d" top="#6d28d9" bottom="#1f2937" armR={[14, 2, 30, -4]} />
      <Box x={50} y={238} w={60} h={34} color="#e5e7eb" />
      <rect x={58} y={210} width={44} height={8} fill="#f8fafc" stroke="#cbd5e1" />
    </Room>
  ),
  'boats-pier': () => (
    <g>
      <rect x={0} y={0} width={400} height={130} fill={C.sky} />
      <rect x={0} y={130} width={400} height={130} fill={C.water} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${i * 90} ${160 + (i % 2) * 40} q20 -6 40 0 t40 0`} stroke={C.waterDark} strokeWidth={3} fill="none" />
      ))}
      <rect x={0} y={150} width={400} height={16} fill={C.wood} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={20 + i * 70} y={166} width={10} height={40} fill={C.woodDark} />
      ))}
      <g>
        <path d="M60 210 h120 l-16 26 h-88 z" fill="#f8fafc" stroke="#94a3b8" />
        <line x1={120} y1={210} x2={120} y2={120} stroke="#6b7280" strokeWidth={4} />
        <path d="M124 124 l40 70 h-40 z" fill="#fef3c7" />
        <line x1={80} y1={210} x2={50} y2={166} stroke="#a16207" strokeWidth={2} />
      </g>
      <g>
        <path d="M230 214 h120 l-14 24 h-92 z" fill="#2563eb" />
        <rect x={262} y={196} width={40} height={18} fill="#e2e8f0" />
        <line x1={340} y1={214} x2={370} y2={166} stroke="#a16207" strokeWidth={2} />
      </g>
    </g>
  ),
  'workers-blueprint': () => (
    <Outdoor horizon={170} ground="#c8ab7e">
      <g stroke="#f59e0b" strokeWidth={4} fill="none">
        <line x1={330} y1={170} x2={330} y2={30} />
        <line x1={250} y1={36} x2={390} y2={36} />
        <line x1={300} y1={36} x2={300} y2={80} strokeWidth={2} />
      </g>
      <rect x={20} y={120} width={90} height={50} fill="#a3a3a3" />
      <Person x={150} y={240} hat="hard" hair="#222" skin={SKIN[2]} top="#f97316" bottom="#1e3a8a" armR={[10, 14, 22, 2]} />
      <Person x={250} y={240} hat="hard" hatColor="#fde047" hairStyle="bun" hair="#4b2e1a" top="#facc15" bottom="#1e3a8a" armL={[10, 14, 22, 2]} />
      <rect x={168} y={126} width={64} height={46} fill="#2563eb" />
      <g stroke="#bfdbfe" strokeWidth={1.5}>
        <path d="M176 138 h20 v20 h28" fill="none" />
        <path d="M200 132 v34" />
        <rect x={180} y={146} width={12} height={10} fill="none" />
      </g>
    </Outdoor>
  ),
  'stairs-plants': () => (
    <Outdoor horizon={120} ground="#d4d4d8">
      <rect x={0} y={60} width={400} height={60} fill="#e4d5c0" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={60 + i * 56} y={230 - i * 26} width={300 - i * 56} height={26} fill={i % 2 ? '#bfbfc6' : '#cfcfd6'} />
          <Plant x={90 + i * 56} y={230 - i * 26} s={0.6} />
        </g>
      ))}
      <line x1={40} y1={250} x2={370} y2={100} stroke={C.metalDark} strokeWidth={4} />
    </Outdoor>
  ),
  'man-suitcase-platform': () => (
    <g>
      <rect x={0} y={0} width={400} height={190} fill="#dde5ee" />
      <rect x={0} y={190} width={400} height={70} fill="#b9bec6" />
      <rect x={0} y={192} width={400} height={6} fill="#facc15" />
      <rect x={210} y={60} width={190} height={124} rx={10} fill="#1d4ed8" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={226 + i * 58} y={80} width={44} height={36} rx={4} fill={C.glass} />
      ))}
      <rect x={250} y={126} width={36} height={58} fill="#1e40af" stroke="#93c5fd" />
      <rect x={0} y={20} width={400} height={10} fill="#64748b" />
      <Person x={140} y={244} hair="#3f3f46" skin={SKIN[1]} top="#475569" bottom="#1f2937" armR={ARMS.pull} />
      <line x1={170} y1={208} x2={186} y2={196} stroke="#374151" strokeWidth={3} />
      <rect x={180} y={196} width={34} height={44} rx={6} fill="#b91c1c" transform="rotate(10 197 218)" />
      <circle cx={186} cy={242} r={3.5} fill="#111827" />
      <circle cx={210} cy={246} r={3.5} fill="#111827" />
    </g>
  ),
  'clock-cabinet': () => (
    <Room floorY={200}>
      <Clock x={200} y={60} r={26} />
      <rect x={160} y={106} width={80} height={130} rx={3} fill="#94a3b8" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={166} y={112 + i * 41} width={68} height={36} rx={2} fill="#a8b4c4" stroke="#7b8796" />
          <rect x={190} y={126 + i * 41} width={20} height={5} rx={2} fill="#475569" />
        </g>
      ))}
      <Plant x={300} y={236} s={1.1} />
    </Room>
  ),
  'queue-counter': () => (
    <Room floorY={195}>
      <rect x={20} y={70} width={130} height={126} fill="#94a3b8" />
      <rect x={30} y={80} width={110} height={60} fill={C.glass} />
      <Person x={85} y={196} s={0.8} hideLegs hair="#2f2f2f" top="#1e3a8a" />
      <rect x={20} y={140} width={130} height={10} fill="#64748b" />
      <Person x={185} y={242} back hair="#3b2a20" top="#be123c" bottom="#334155" />
      <Person x={232} y={242} back hairStyle="long" hair="#6b4226" top="#0e7490" skirt bottom="#1f2937" />
      <Person x={279} y={242} back hair="#111" top="#65a30d" bottom="#374151" />
      {[0, 1, 2].map((i) => (
        <Chair key={i} x={336 + i * 22} y={242} s={0.55} color="#64748b" />
      ))}
    </Room>
  ),
  'produce-stand': () => (
    <Outdoor horizon={180} ground={C.pavement}>
      <rect x={30} y={30} width={340} height={150} fill="#e9dcc7" />
      <rect x={140} y={92} width={120} height={88} fill="#7a5c43" />
      <rect x={60} y={80} width={60} height={50} fill={C.glass} stroke="#b59c7e" strokeWidth={4} />
      <rect x={280} y={80} width={60} height={50} fill={C.glass} stroke="#b59c7e" strokeWidth={4} />
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={`M${30 + i * 34} 40 h34 v26 q-17 10 -34 0 z`} fill={i % 2 ? '#16a34a' : '#f8fafc'} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={52 + i * 78} y={196} width={70} height={28} fill="#b07a46" stroke="#8a5a30" />
          {Array.from({ length: 5 }, (_, j) => (
            <circle key={j} cx={60 + i * 78 + j * 13} cy={192} r={7} fill={['#ef4444', '#f59e0b', '#84cc16', '#a855f7'][i]} />
          ))}
        </g>
      ))}
      <rect x={44} y={224} width={312} height={6} fill="#6b7280" />
    </Outdoor>
  ),
  'speaker-podium': () => (
    <Room floorY={200} wall="#e8ecf3">
      <rect x={60} y={20} width={280} height={56} rx={4} fill="#0e7490" />
      <rect x={90} y={40} width={220} height={8} rx={3} fill="#a5f3fc" />
      <rect x={120} y={56} width={160} height={6} rx={3} fill="#67e8f9" />
      <Person x={200} y={246} hideLegs hairStyle="bun" hair="#2b1d14" skin={SKIN[3]} top="#1f2937" armR={[16, 8, 22, -8]} />
      <path d="M160 160 h80 l-10 86 h-60 z" fill="#78553a" />
      <rect x={154} y={152} width={92} height={12} rx={3} fill="#5e4129" />
      <line x1={212} y1={152} x2={222} y2={120} stroke="#374151" strokeWidth={3} />
      <ellipse cx={223} cy={116} rx={5} ry={7} fill="#111827" />
    </Room>
  ),
};

export const SCENE_IDS = Object.keys(scenes);

export function hasScene(id: string): boolean {
  return id in scenes;
}

export function Scene({ id, alt }: { id: string; alt: string }) {
  const render = scenes[id];
  return (
    <figure className="m-0">
      <svg viewBox="0 0 400 260" role="img" aria-label={alt} className="w-full h-auto rounded-xl border border-line bg-white">
        <title>{alt}</title>
        {render ? render() : <text x={200} y={130} textAnchor="middle" fill="#64748b">Illustration indisponible</text>}
      </svg>
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}

