async function test() {
  try {
    const mod = await import("./src/modules/ratings/sellerRating.routes.js");
    console.log("Import success!", Object.keys(mod));
  } catch (err) {
    console.error("IMPORT ERROR:", err);
  }
}
test();
