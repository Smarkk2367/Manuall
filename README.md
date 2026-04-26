# ManuAll - Assembly Instruction Generator

A web application that processes STEP files to generate IKEA-style assembly instructions.

## Project Structure

- **/frontend**: Next.js application with React Three Fiber for 3D visualization.
- **/backend**: Nest.js API gateway managing jobs, SSE progress, and AI instructions.
- **/cad**: Python module using CadQuery/OpenCascade for geometry processing and HLR generation.

## Technologies

- **Frontend**: Next.js, Three.js, Tailwind CSS.
- **Backend**: Nest.js, PostgreSQL (Prisma), OpenRouter AI.
- **CAD**: CadQuery, OpenCascade (HLR).

## Getting Started

1. Start the database: `docker-compose up -d`
2. Set up the Python environment in `/cad`.
3. Install dependencies in `/frontend` and `/backend`.
4. Run both servers.