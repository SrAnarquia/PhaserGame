﻿using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Web;

namespace MilGracias.Data
{
    public class MilGraciasContext : DbContext
    {
        // You can add custom code to this file. Changes will not be overwritten.
        // 
        // If you want Entity Framework to drop and regenerate your database
        // automatically whenever you change your model schema, please use data migrations.
        // For more information refer to the documentation:
        // http://msdn.microsoft.com/en-us/data/jj591621.aspx
    
        public MilGraciasContext() : base("name=MilGraciasContext")
        {
        }

        public System.Data.Entity.DbSet<MilGracias.Models.Users> Users { get; set; }
    }
}
