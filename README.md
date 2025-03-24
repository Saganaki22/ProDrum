# 🥁 ProDrum

A web-based drum machine and beat sequencer with customizable kits and sample recording capabilities.

![image](https://github.com/user-attachments/assets/dc84f428-2c0a-46e3-951f-3996584a8508)


## Features

- Sleek, modern interface with customizable drum pads
- Multiple drum kits: Acoustic, Electronic, and Hip Hop
- Real-time sound synthesis and sample playback
- Recording and playback capabilities
- Custom sample uploads and management
- Beat sequencing with tempo control
- Audio visualization
- Effects processing (reverb, delay, distortion)
- MIDI keyboard support via key mapping
- Responsive design for desktop and mobile

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- pnpm package manager

### Installation

1. Clone the repository
   ```
   git clone https://github.com/Saganaki22/ProDrum.git
   cd ProDrum
   ```

2. Install dependencies
   ```
   pnpm install
   ```

3. Start the development server
   ```
   pnpm dev
   ```

4. Open your browser to `http://localhost:3000`

## Usage

- Click or tap on drum pads to trigger sounds
- Use keyboard keys to trigger sounds (keys are displayed on each pad)
- Press record to capture your performance
- Adjust tempo with the slider
- Toggle loop mode for continuous playback
- Switch between different drum kits
- Upload your own samples to customize pads
- Toggle metronome for timing assistance
- Adjust master volume or mute output

## Building for Production

```
pnpm build
pnpm start
```

## Technology Stack

- Next.js for the application framework
- React for UI components
- Web Audio API for sound generation and processing
- Tailwind CSS for styling
- Radix UI for UI components
- IndexedDB for local sample storage

## License

This project is licensed under the Apache License, Version 2.0 - see below for details:

```
Copyright 2023 Prodrum

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Acknowledgments

- Inspired by classic drum machines like the Roland TR-808 and Akai MPC
- Thanks to the Web Audio API community for inspiration and resources
- UI components powered by shadcn/ui

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 
