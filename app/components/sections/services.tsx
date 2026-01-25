"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardDescription } from "../ui/card";
import { services } from "@/app/lib/constants";
import { containerVariants, itemVariants } from "@/app/lib/animations";

export function Services() {
  return (
    <section id="services" className="py-24 relative bg-white">
      {/* No background decoration needed - clean white background */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-love-taking text-4xl sm:text-5xl md:text-6xl text-foreground mb-4">
            Des services pensés pour{" "}
            <span className="text-primary">eux</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Que vous ayez besoin d&apos;une garde ponctuelle ou régulière, nous avons
            la solution adaptée à chaque situation.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map((service, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl ${service.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <service.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <CardTitle className="mb-2 flex items-center gap-2">
                      {service.title}
                      <span className="text-xl">{service.emoji}</span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      {service.description}
                    </CardDescription>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
