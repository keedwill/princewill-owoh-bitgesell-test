import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Spinner from "../components/spinner";

function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  const [loading, setLoading] = useState(false);
  

  useEffect(() => {
    setLoading(true);
    // Define the async function that performs the fetch
    const fetchItem = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/items/" + id);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setItem(data);
      } catch (err) {
        console.error("Error fetching item:", err);
       
      } finally {
        setLoading(false);
      }
    };

    // --- Delay the API request by 500 milliseconds (half a second) ---
    // i delayed it to show the loading state
    const handler = setTimeout(() => {
      fetchItem(); // Execute the fetch after the delay
    }, 500); // 500ms delay

    // --- Cleanup function for useEffect ---
    // This will clear the timeout if the component unmounts or
    // if `id`  changes before the 500ms delay finishes.
    return () => {
      clearTimeout(handler);
    };
  }, [id]);

  // if (!item) return <p>Loading...</p>;

  return (
    <div
      className="text-stone-100 antialiased h-[100%] flex flex-col justify-between"
      style={{ padding: 16 }}
    >
      {/* Background Grid and Radial Gradient (for visual flair) */}
      {/* These divs are purely for background styling and are positioned absolutely. */}
      <div className="fixed inset-0 -z-10">
        <div class="relative h-full w-full bg-black">
          <div class="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div class="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fbfbfb36,#000)]"></div>
        </div>{" "}
      </div>

      {loading ? (
        // Show spinner when loading
        <div className="p-4">
          <Spinner />
        </div>
      ) : // Once not loading, check if there is an item
      !item ? (
        <p>No item with ID {id} found.</p>
      ) : (
        <>
          <h2>{item?.name}</h2>
          <p>
            <strong>Category:</strong> {item?.category}
          </p>
          <p>
            <strong>Price:</strong> ${item?.price}
          </p>
        </>
      )}
    </div>
  );
}

export default ItemDetail;
