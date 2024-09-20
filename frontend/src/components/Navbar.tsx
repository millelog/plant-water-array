import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow px-4 py-2 flex justify-between">
      <div className="text-xl font-bold">Moisture Sensing System</div>
      <div>{/* Placeholder for user profile or settings */}</div>
    </nav>
  );
};

export default Navbar;
