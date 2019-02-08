import Persistence from './Persistence.js';
import Utils from './Diabetes/Util.js';
import default_settings from './default_settings.js';
import Client from './extension-framework/Client.js';
import PromiseUtils from './Promise-Utils/PromiseUtils.js';


document.addEventListener('DOMContentLoaded', function()
{
	//var ext = new Client();
	let persistence = new Persistence();

	Utils.getById('optimize').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		//persistence.optimizeAllStock().then(()=>
		//persistence.optimizeAllUrls().then(()=>
		//{
		//	console.log('Ends');
		//	Utils.alert('Optimization Ends');
		//});
		persistence.deleteBadValues();
	});

	Utils.getById('backupGenerateBackupFile').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );

		let type = Utils.getById('backupType').value;

		switch( type )
		{
			case 'Products':
			{
				Utils.getById('backupStatus').innerHTML = '';

				persistence.database.createBackup().then(( obj )=>
				{
					for(let i in obj)
					{
						let objb = {};
						objb[ i ] = obj[ i ];

						let string = JSON.stringify( objb );
						console.log( string.length );
						let blob = new Blob([string],{ type:'application/json'});
						string = null;
						let objectURL = URL.createObjectURL( blob );

						delete obj[ i ];

						let date = new Date();

						let anchor = window.document.createElement('a');
						anchor.setAttribute('download', i.toUpperCase()+'_backup_'+date.toISOString()+'.json');
						anchor.setAttribute('href', objectURL );
						anchor.textContent = 'Backup_'+i.toUpperCase()+"_"+date.toISOString();
						anchor.classList.add('button');
						Utils.getById('backupStatus').append( anchor );
						//URL.revokeObjectURL( objectURL );
						let br = document.createElement('br');
						Utils.getById('backupStatus').append( br );
					}
				});

				//let start = '0040423131';

				//return persistence.getAllIncremental('products',{ '>=': start },'asin')
				//.then((productList)=>
				//{
				//	let href = persistence.getDownloadHref({ products: productList ,stock:[] ,offers: [] });
				//	let date = new Date();
				//	Utils.getById('backupStatus').innerHTML = '';

				//	let anchor = window.document.createElement('a');
				//	anchor.setAttribute('download', 'PRODUCTS_backup_'+( date.toISOString() )+'.json');
				//	anchor.setAttribute('href', href );
				//	anchor.textContent = 'Backup_Products'+date.toISOString();
				//	anchor.classList.add('button');

				//	Utils.getById('backupStatus').append( anchor );

				//	return persistence.getStockList( null, null );
				//})
				//.catch((e)=>
				//{
				//	console.log( e );
				//	Utils.alert('An error occurred please check logs');
				//});
				break;
			}
			case 'Offers':
			{
				persistence.getOffersCount( null, null ).then((offersCount)=>
				{
					let start 	= 1;
					let count	= offersCount/100000;

					if( count !== Math.floor( count ) )
						count = Math.floor( count )+1;

					let times =new Array( count );
					times.fill(0);
					let allRecords = [];

					let generator = ()=>
					{
						return persistence.getOffersByOptions({'>=':start, 'count' : 100000 }).then((all)=>
						{
							start = all[ all.length-1 ].id;
							allRecords.push( ...all );
							return Promise.resolve( 1 );
						});
					};

					return PromiseUtils.runSequential( times, generator ).then(()=>
					{
						return Promise.resolve( 1 );
					})
					.then(()=>
					{
						let href = persistence.getDownloadHref({ products: [], stock: [] , offers: allRecords });
						Utils.getById('backupStatus').innerHTML = '';

						let date = new Date();
						let anchor = window.document.createElement('a');
						anchor.setAttribute('download', 'OFFERS_backup'+date.toISOString()+'.json');
						anchor.setAttribute('href', href );
						anchor.textContent = 'Backup_Offers'+date.toISOString();
						anchor.classList.add('button');

						Utils.getById('backupStatus').append( anchor );
					});
				})
				.catch((e)=>
				{
					console.log( e );
					Utils.alert('An error occourred please check the logs');
				});

				break;
			}
			case 'Stock':
			{
				return persistence.getStockList( null, null ).then((stock)=>
				{
						stock.forEach((i)=> { delete i.id; });

						let href = persistence.getDownloadHref({ products: [], stock: stock, offers: []});
						Utils.getById('backupStatus').innerHTML = '';
						let date = new Date();


						let anchor = window.document.createElement('a');
						anchor.setAttribute('download', 'STOCK_backup_'+date.toISOString()+'.json');
						anchor.setAttribute('href', href );
						anchor.textContent = 'Backup_Stock'+date.toISOString();
						anchor.classList.add('button');
						Utils.getById('backupStatus').append( anchor );
				})
				.catch((e)=>
				{
					Utils.alert('An error occurred please try again later');
				});
			}
			case 'Links':
			{
				let option = {
					'>=':0
				};

				persistence.getAllIncremental( 'links',{ '>=': 0 },'id')
				.then((links)=>
				{
					links.forEach((i)=>{ delete i.id; });

					let href = persistence.getDownloadHref({ products: [], stock: [], offers: [], links: links });
					Utils.getById('backupStatus').innerHTML = '';
					let date = new Date();
					let anchor = window.document.createElement('a');
					anchor.setAttribute('download', 'LINKS_backup_'+date.toISOString()+'.json');
					anchor.setAttribute('href', href );
					anchor.textContent = 'Backup_Links'+date.toISOString();
					anchor.classList.add('button');
					Utils.getById('backupStatus').append( anchor );
				});
			}
		}
	});


	persistence.init().catch((e)=>
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

				console.log('Try to save',obj.stock.length);

				Promise.resolve(()=>
				{

				})
				.then(()=>
				{

					if( 'products' in obj.products )
						return persistence.saveProductLists( obj.products );

					return Promise.resolve(1);
				})
				.then(()=>
				{
					if( 'stock' in obj )
						return persistence.addStock( obj.stock );

					return Promise.resolve( 1 );
				})
				.then(()=>
				{
					if( 'offers' in obj )
						return persistence.addOffers( obj.offers );

					return Promise.resolve( 1 );
				})
				.then(()=>
				{
					if( 'links' in obj )
						return persistence.addUrls( obj.links );

					return Promise.resolve( 1 );
				})
				.then((result)=>
				{
					console.log('It Finish');
					alert('It finish importing');
					return result;
				})
				.catch((e)=>
				{
					alert('Fails to importing data');
				});
			}
			catch(e)
			{
				alert('Fails to importing data');
				console.log( e );
			}
	    };

	    reader.onerror = function (evt) {
			console.log( evt.target.result );
	        document.getElementById("fileContents").innerHTML = "error reading file";
	    };
	});
});

