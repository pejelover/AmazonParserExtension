
var persistence	= new Persistence();
var ext			= new Server();


ext.addListener('UrlDetected',(url,request,tab_id)=>
{
	persistence.updateUrl( request ).then(()=>
	{

	});
});

ext.addListener('ProductsFound',(url,request,tab_id)=>
{
	console.log('products found', request );
	persistence.updateProductLists( request );
});
