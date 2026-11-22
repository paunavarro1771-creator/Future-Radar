'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const FILE=path.join(process.cwd(),'data/u17-2026-snapshot.json');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=600');
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  try{
    const archive=JSON.parse(await fs.readFile(FILE,'utf8'));
    if(!Array.isArray(archive.matches))throw Error('Invalid snapshot');
    return res.status(200).json({...archive,available:true,isLive:false,
      warning:'Historical snapshot only. Not a real-time feed.'});
  }catch(error){
    if(error.code==='ENOENT')return res.status(404).json({available:false,error:'snapshot_not_yet_created',
      message:'Scheduled archive has not produced its first valid snapshot.'});
    return res.status(500).json({available:false,error:'invalid_snapshot'});
  }
};
