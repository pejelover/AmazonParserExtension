
var persistence	= new Persistence();
var ext			= new Server();


ext.addListener("AddProduct",(url,request,tab_id)=>
{

});


ext.addListener("addProductList",(url,request,tab_id)=>
{

});

ext.addListener("ProductsFound",(url,request,tab_id)=>
{
	console.log("products found", request );
	persistence.updateProductLists( request );
});
