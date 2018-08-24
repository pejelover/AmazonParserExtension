document.addEventListener('DOMContentLoaded', function()
{
	//var ext = new Client();
	let persistence = new Persistence();
	persistence.init()
	.then(()=>
	{

		let productPromise = persistence.getProductList( null, null ).then((productList)=>
		{

			return persistence.getStockList( null, null )
			.then(( stockList )=>
			{
				return Promise.resolve({products: productList, stock: stockList });
			});
		})
		.then(( results )=>{

			let href = persistence.getDownloadHref( results );

			let date = new Date();
			let anchor= Utils.getById("backupLink");

			anchor.setAttribute('download', 'backup'+date.toISOString()+'.json');
			anchor.setAttribute('href', href );
			anchor.textContent = date.toISOString();
		})
		.catch((e)=>
		{
			console.log( e );

			let element = document.createElement('div');
			element.textContent = 'Error '+e.msg;
			document.body.append( element );
		});


		let importButton = Utils.getById('importButton');
		importButton.addEventListener('click',(evt)=>
		{
			var file	= document.getElementById("inputFile").files[0];
		    var reader	= new FileReader();
		    reader.readAsText(file, "UTF-8");
		    reader.onload = function (evt) {
		        //document.getElementById("fileContents").innerHTML = evt.target.result;
				try
				{
					let obj= JSON.parse( evt.target.result );

					return persistence.saveProductLists( obj.products ).then(()=>
					{
						return persistence.addStock( obj.stock );
					})
					.catch((e)=>
					{
						console.log( e );
					});
				}
				catch(e)
				{
					console.log( e );
				}
		    };

		    reader.onerror = function (evt) {
				console.log( evt.target.result );
		        document.getElementById("fileContents").innerHTML = "error reading file";
		    };
		});
	});
});

