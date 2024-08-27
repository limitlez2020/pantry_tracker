import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    /* Extract the 'itemNames' property from the request body */
    const { itemNames } = await req.json();
    // console.log("Received itemNames:", itemNames);

    /* EDAMAM API Id and Key: */
    const appId = process.env.EDAMAM_API_ID;
    const appKey = process.env.EDAMAM_API_KEY;

    /* Randomly select 1 to 3 random ingredients from itemNames to get recipes on */
    const numIngredients = Math.floor(Math.random() * 3) + 1;
    const shuffledIngredients = itemNames.sort(() => 0.5 - Math.random()); /* Randomly Shuffle and Select Ingredients */
    const selectedIngredients = shuffledIngredients.slice(0, numIngredients);
    const ingredients = selectedIngredients.join(',');

    /* Construct the API URL with the ingredients, app ID, and app key */
    const apiUrl = `https://api.edamam.com/search?q=${ingredients}&app_id=${appId}&app_key=${appKey}&from=0&to=3`;

    /* Fetch recipes from the EDAMAM API */
    const response = await fetch(apiUrl);
    /* Fetch error handling: */
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch recipes" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    /* Extract the JSON data from the response: */
    const data = await response.json();

    /* Extract the recipes from the data */
    const recipes = data.hits.map(hit => hit.recipe);

    /* Get label and ingredients of breakfast, lunch, and dinner: */
    const breakfast = {
      label: recipes[0]?.label || "No breakfast suggestion",
      ingredients: recipes[0]?.ingredientLines || [],
    };
    const lunch = {
      label: recipes[1]?.label || "No lunch suggestion",
      ingredients: recipes[1]?.ingredientLines || [],
    };
    const dinner = {
      label: recipes[2]?.label || "No dinner suggestion",
      ingredients: recipes[2]?.ingredientLines || [],
    };

    /* Return the recipes as a JSON response */
    return NextResponse.json({
      breakfast,
      lunch,
      dinner,
    });

  } catch (error) {
    console.error("Error processing the request:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch recipes" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
