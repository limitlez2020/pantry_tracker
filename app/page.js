/* Make this a client sides app: */
"use client"


import "./globals.css"
import Image from "next/image";
import { useState, useEffect } from "react";
import { firestore, storage } from "@/firebase";
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from "firebase/firestore";
/* For uploading images: */
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
/* Import Icons: */
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/solid";
/* Import Accordion: */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"




export default function Home() {
  /* Inventory Management Helper Functions: */
  /* 1. Store Inventory: */
  const [inventory, setInventory] = useState([]);
  /* 2. Filtering Inventory: */
  const [filteredInventory, setFilteredInventory] = useState([]);
  /* 3. Loading state: */
  const [loading, setLoading] = useState(true);
  /* 4. State variables for modal to add items: */
  const [open, setOpen] = useState(false);
  /* 5. Item Names: */
  const [itemName, setItemName] = useState("");
  /* 6. Item Quantity: */
  const [quantity, setQuantity] = useState(1);
  /* 7. Search Query: */
  const [searchQuery, setSearchQuery] = useState("");
  /* 8. Image file and URL: */
  const [imageFile, setImageFile] = useState(null);
  /* 9. Display the recipes: */
  const [displayRecipes, setDisplayRecipes] = useState(false);
  /* 10. Get Recipes: */
  const [recipes, setRecipes] = useState({
    breakfast: {
      label: '',
      ingredients: []
    },
    lunch: {
      label: '',
      ingredients: []
    },
    dinner: {
      label: '',
      ingredients: []
    }
  });
  



  const fetchRecipes = async () => {
    try {
      /* Get item names to use in API call */
      const itemNames = inventory.map(item => item.name);
      console.log('Sending item names to API:', itemNames);
  
      /* Send a POST request to the '/api/' endpoint with a
       * JSON payload containing the 'itemNames' data */
      const response = await fetch('/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemNames, /* this is an array */
        }),
      });
  
      /* Log the raw response object */
      console.log('Raw API response:', response);
  
      const data = await response.json();
  
      /* Log the parsed response data */
      console.log('Parsed API response data:', data);
  
      /* Ensure the response keys match what's returned by the backend */
      setRecipes({
        breakfast: {
          label: data.breakfast?.label || 'No breakfast suggestion',
          ingredients: data.breakfast?.ingredients || 'No ingredients available'
        },
        lunch: {
          label: data.lunch?.label || 'No lunch suggestion',
          ingredients: data.lunch?.ingredients || 'No ingredients available'
        },
        dinner: {
          label: data.dinner?.label || 'No dinner suggestion',
          ingredients: data.dinner?.ingredients || 'No ingredients available'
        }
      });
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };
  





  /* Fetch Inventory from Firebase: */
  const updateInventory = async () => {
    const snapshot = query(collection(firestore, "inventory"));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach(doc => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      })
    });

    setInventory(inventoryList);
    setFilteredInventory(inventoryList);
    setLoading(false);
  }

  /* Update inventory whenever the page loads: */
  useEffect(() => {
    updateInventory()
  }, [])



  /* Add an item to the inventory:
  * Add name, quantity, and image:
  */
  const addItem = async (itemName) => {
    let imageUrl = null;
    
    /* Upload the new image if provided */
    if (imageFile) {
      imageUrl = await uploadImage(itemName);
    }
    
    const docRef = doc(collection(firestore, "inventory"), itemName);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const { quantity: existingQuantity, imageUrl: existingImageUrl } = docSnap.data();
      /* Use the new imageUrl if provided, otherwise keep the existing one */
      await setDoc(docRef, {
        quantity: existingQuantity + quantity,
        imageUrl: imageUrl !== null ? imageUrl : existingImageUrl
      }, { merge: true });
    } else {
      await setDoc(docRef, { quantity, imageUrl });
    }
    
    /* Reset imageFile and quantity state after use */
    setImageFile(null);
    setQuantity(1);
    
    await updateInventory();
  };





  /* Increment quantity of an item */
  const incrementItem = async (itemName) => {
    const docRef = doc(collection(firestore, "inventory"), itemName);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + 1 }, { merge: true });

      /* Directly update the inventory state to reflect changes: */
      setInventory(prevInventory =>
        prevInventory.map(item =>
          item.name === itemName ? { ...item, quantity: quantity + 1 } : item
        )
      );

    } else {
      console.error(`Item ${itemName} does not exist in the inventory.`);
    }
  };




  /* Decrement + Remove an item from the inventory: */
  const removeItem = async (itemName) => {
    const docRef = doc(collection(firestore, "inventory"), itemName);
    const docSnap = await getDoc(docRef);
  
    if (docSnap.exists()) {
      const { quantity, imageUrl } = docSnap.data();
      if (quantity === 1) {
        /* Delete the item document from Firestore */
        await deleteDoc(docRef);
        /* Delete the image from Firebase Storage */
        if (imageUrl) {
          const storageRef = ref(storage, `inventory_images/${itemName}`);
          await deleteObject(storageRef);
        }
        /* Update the inventory state to reflect changes: */
        setInventory(prevInventory =>
          prevInventory.filter(item => item.name !== itemName)
        );
      } else {
        await setDoc(docRef, { quantity: quantity - 1 }, { merge: true });

        /* Directly update the inventory state to reflect changes: */
        setInventory(prevInventory =>
          prevInventory.map(item =>
            item.name === itemName ? { ...item, quantity: quantity - 1 } : item
          )
        );
      }
    }
  };
  

  
  /* Modal Function: */
  const handleOpen = () => {setOpen(true)}
  const handleClose = () => {setOpen(false)}



  /**********  FILTER FUNCTIONALITY  ***********/
  /* Handle search input change: */
  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  /* Filter Inventory: */
  /* If something is searched, display the item
   * If the searchQuery is empty, just show the whole inventory
   */
  useEffect(() => {
    /* Avoid loading when in the search query page */
    setLoading(false);
    if (searchQuery) {
      const filtered = inventory.filter(item => {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase())
      })
      setFilteredInventory(filtered);
    }
    else {
      setFilteredInventory(inventory);
    }
  }, [searchQuery, inventory])
  /************************************/



  /******* IMAGE FUNCTIONALITY: *******/
  /* Handle image file change: */
  const handleImageChange = (e) => {
    setImageFile(e.target.files[0])
  }

  /* Handle image upload:
   * Upload image and get URL:
   */
  const uploadImage = async (itemName) => {
    if (!imageFile) return null;
  
    const storageRef = ref(storage, `inventory_images/${itemName}`);
    await uploadBytes(storageRef, imageFile);
    const url = await getDownloadURL(storageRef);
    return url;
  };
  /************************************/

  


  


  return (
    <div className="w-full min-h-screen">
      <div className="w-full mt-24 flex flex-col justify-center
                      items-center gap-2">
        {/* Add Modal: */}
        {open && <div className="absolute top-1/2 left-1/2 bg-white border-2
                      border-black shadow-xl drop-shadow-xl p-6 flex flex-col
                      transform -translate-x-1/2 -translate-y-1/2 w-[320px]"
        >
          <div className="mb-6">
            <p className="text-xl font-semibold">Add New Item</p>
            <p className="text-sm text-gray-500">
              Fill out the form to add a new item
            </p>
          </div>

          {/* Adding Items: */}
          <div className="w-full flex flex-col space-y-3">
            {/* Name: */}
            <div className="flex flex-col">
              <p className="text-sm">Name</p>
              <input
                className="w-full h-10 border border-neutral-400 rounded-none text-sm
                          p-2 focus:outline-none focus:ring-1 focus:ring-[#333]"
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                }}
                required
              />
            </div>


            {/* Quantity: */}
            <div className="flex flex-col">
              <p className="text-sm">Quantity</p>
              <input
                type="number"
                className="w-full h-10 border border-neutral-400 rounded-none text-sm p-2 focus:outline-none focus:ring-1 focus:ring-[#333]"
                value={quantity}
                min={1}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setQuantity(value < 1 ? 1 : value);
                }}
                required
              />
            </div>
            

            {/* Image Upload: */}
            <div className="flex flex-col pb-6">
              <p className="text-sm">Image</p>
              <div className="border border-neutral-400 p-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="h-full"
                  style={{
                    transform: 'scale(0.75)',
                    transformOrigin: 'left center',
                  }}
                  // loading="lazy"
                />
              </div>
            </div>

            {/* Add & Cancel Buttons: */}
            <div className="flex flex-row h-10 justify-between space-x-2 align-middle w-full">
              {/* Add button: */}
              <button
                className={`flex-1 bg-black text-white text-sm border border-black h-full
                            px-4 py-2 hover:bg-[#333] hover:border-black
                            ${!itemName ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  addItem(itemName.charAt(0).toUpperCase() + itemName.slice(1).toLowerCase());
                  setItemName("");
                  setQuantity(1); /* Reset quantity after adding item */
                  handleClose();
                }}
                disabled={!itemName}
              >
                Add
              </button>

              {/* Cancel button: */}
              <button
                className="flex-1 bg-[#601b1b] text-white text-sm border border-black h-full
                            px-4 py-2 hover:bg-[#822525] hover:border-black"
                onClick={() => {
                  /* Reset quantity after cancelling */
                  setQuantity(1); 
                  /* Close the modal: */
                  handleClose();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>}




        {/**************  MAIN SCREEN  ***************/}
        {/* Container for the main screen: */}
        {/* Main Screen Container: */}
        <div className="flex flex-col justify-center items-center w-full max-w-full gap-2">
          {/* Search Bar */}
          <div className="w-full max-w-[600px] px-4 sm:px-9 md:px-12 relative">
            <MagnifyingGlassIcon
              className="w-7 h-7 absolute pl-3 top-1/2 transform
                         -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full h-10 pl-11 pr-4 border border-gray-900 rounded-none
                         focus:outline-none focus:ring-gray-900 text-sm"
            />
          </div>

          {/* Inventory Title and Add Item Button */}
          <div className="flex justify-between items-center w-3/4 mt-12">
            <p className="text-lg font-semibold">
              Inventory
            </p>
            <button
              onClick={handleOpen}
              className="bg-black text-white text-xs p-4 font-semibold gap-[6.5px]
                         flex items-center border border-black rounded-none h-7 
                         hover:bg-[#333] hover:text-white hover:border-black"
            >
              Add Item
              <PlusIcon className="w-3 h-3"/>
            </button>
          </div>

          {/* Inventory List */}
          <div className="w-3/4 mx-auto">
            {loading ? (
              /*  Show loading text while fetching data */
              <div className="flex items-center justify-center mt-20">
                <p className="text-base">Loading...</p>
              </div>
            ) : (
              /* Grids: this div and the next one */
              <div className="flex flex-wrap gap-x-8 gap-y-4 justify-center">
                {/* Display Inventory */}
                {filteredInventory.map((item) => (
                  /* Container for each box: */
                  <div key={item.name} className="py-2">
                    {/* Each Item Box: */}
                    <div className="flex flex-col p-2 border-2 border-[#333] w-[240px]">
                      {/* Display Image in Inventory */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-[200px]"
                        />
                      ) : (
                        <div className="w-full h-[200px] flex justify-center items-center
                                        border-2 border-dashed border-gray-900">
                          <p variant="body2" color="textSecondary">
                            No Image
                          </p>
                        </div>
                      )}
                      {/* Display Item Name & Quantity in Inventory */}
                      <div className="flex flex-col items-start">
                        <p className="-mb-1"> {item.name} </p>
                        <p className="text-2xl font-semibold"> {item.quantity} </p>
                      </div>
                      {/* Add & Remove Buttons */}
                      <div className="flex flex-row gap-2 justify-center items-center">
                        {/* Add Button */}
                        <button
                          onClick={() => incrementItem(item.name)}
                          className="bg-[#DDF353] text-black text-xs font-normal
                                    border-2 border-[#111111] rounded-none h-10 w-full
                                    hover:bg-opacity-80"
                        >
                          Add
                        </button>
                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.name)}
                          className="bg-[#111111] text-white text-xs font-normal border-2
                                    border-[#111111] rounded-none h-10 w-full
                                    hover:bg-[#333]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Button to fetch AI recipe suggestions */}
        {(inventory.length >= 1) &&
        <div className={`flex justify-center mt-12 ${displayRecipes ? 'mb-2 mt-20' : 'mb-20'}`}>
          <button
            onClick={
              () => {
                fetchRecipes();
                setDisplayRecipes(true);
              }
            }
            className="bg-[#D2ADE7] text-black text-xs font-semibold border-2
                       border-[#111111] rounded-none h-10 w-full px-3
                       hover:border-r-[4px] hover:border-b-[4px]"
          >
            Quick Recipes
          </button>
        </div>
        }

        {/* Display AI recipe suggestions */}
        {/* Use accordion display */}
        {displayRecipes && (
        <div className="w-full flex justify-center px-4 mb-20">
          <Accordion type="single" collapsible className="flex flex-col w-96 gap-4 px-4">
            {/* Breakfast: */}
            <AccordionItem value="item-1">
              <AccordionTrigger className="border-2 border-black bg-[#F2F2F2] text-black text-lg font-semibold px-3 mb-2">
                Breakfast
              </AccordionTrigger>
              <AccordionContent className="px-3 mb-5">
                <p className="font-medium text-base">{recipes.breakfast.label}</p>
                {/* Display each ingredients on a seperate line: */}
                <div className="text-sm">
                  {recipes.breakfast.ingredients.map((ingredient, index) => (
                    <p key={index}>
                      - {ingredient}
                      <br />
                    </p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Lunch: */}
            <AccordionItem value="item-2">
              <AccordionTrigger className="border-2 border-black bg-[#F2F2F2] text-black text-lg font-semibold px-3 mb-2">
                Lunch
              </AccordionTrigger>
              <AccordionContent className="px-3 mb-5">
                <p className="font-medium text-base">{recipes.lunch.label}</p>
                {/* Display each ingredients on a seperate line: */}
                <div className="text-sm">
                  {recipes.lunch.ingredients.map((ingredient, index) => (
                    <p key={index}>
                      - {ingredient}
                      <br />
                    </p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Dinner: */}
            <AccordionItem value="item-3">
              <AccordionTrigger className="border-2 border-black bg-[#F2F2F2] text-black text-lg font-semibold px-3 mb-2">
                Dinner
              </AccordionTrigger>
              <AccordionContent className="px-3 mb-5">
                <p className="font-medium text-base">{recipes.dinner.label}</p>
                {/* Display each ingredients on a seperate line: */}
                <div className="text-sm">
                  {recipes.dinner.ingredients.map((ingredient, index) => (
                    <p key={index}>
                      - {ingredient}
                      <br />
                    </p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        )}

      </div>  {/* END OF CONTAINER SCREEN */}
    </div>
  );
}
