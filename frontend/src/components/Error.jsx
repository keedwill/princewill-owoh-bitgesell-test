import React from 'react'


const Error = ({ error, fetch, currentPage, itemsPerPage, searchQuery }) => {
  return (
    <div className="px-[5%] mt-4 overflow-x-hidden text-stone-100 antialiased h-[100%] flex flex-col justify-between">
      <h1 className="text-center uppercase bg-gradient-to-r from-stone-300 to-stone-600 bg-clip-text text-3xl tracking-tight text-transparent">
        Items List
      </h1>
      <div className="fixed inset-0 -z-10">
        <div className="relative h-full w-full bg-black">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fbfbfb36,#000)]"></div>
        </div>
      </div>

      <div className="text-red-400 bg-red-900 bg-opacity-50 border border-red-700 p-6 rounded-lg text-center mx-auto my-8 max-w-md shadow-lg">
        <p className="font-bold text-xl mb-3">Failed to load items!</p>
        <p className="text-lg mb-4">
          {error || "An unexpected error occurred while fetching data."}
        </p>
        <button
          onClick={() => fetch(currentPage, itemsPerPage, searchQuery)} // Re-attempt the fetch
          className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default Error