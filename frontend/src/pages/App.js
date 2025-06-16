import React from 'react';
// import "../index.css"
import { Routes, Route, Link } from 'react-router-dom';
import Items from './Items';
import ItemDetail from './ItemDetail';
import { DataProvider } from '../state/DataContext';

function App() {
  return (
    <DataProvider>
      <nav className='border-b border-gray-200 p-[16px] text-[40px] text-stone-100 font-[700]' >
        <span className='cursor-pointer' onClick={() => window.location.href = "/"}>Items</span>
      </nav>
      <Routes>
        <Route path="/" element={<Items />} />
        <Route path="/items/:id" element={<ItemDetail />} />
      </Routes>
    </DataProvider>
  );
}

export default App;